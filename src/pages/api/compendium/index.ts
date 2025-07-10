// File: /pages/api/compendium/index.ts

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';
import { bucket } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import { MethodConfig, withPermissionCheck } from '@/lib/server/withPermissionCheck';
import { ACCESS_PERMISSION } from '@prisma/client';
import { getFieldValue } from '@/utils/parseApiField';
import { apiHelpers } from '@/lib/server/responseHelpers';

export const config = {
    api: {
        bodyParser: false,
    },
};

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [
            ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY,
            ACCESS_PERMISSION.MANAGE_MY_COHORT
        ],
        filters: {
            [ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY]: {
                priority: 1,
                filter: {},
            },
            [ACCESS_PERMISSION.MANAGE_MY_COHORT]: {
                priority: 1,
                filter: {},
            },
        },
    },
    put: {
        permissions: [ACCESS_PERMISSION.MANAGE_MY_COHORT],
    }
};


const parseForm = async (req: NextApiRequest): Promise<{ fields: any; files: any }> => {
    try {
        return await new Promise((resolve, reject) => {
            const form = formidable({ multiples: true, keepExtensions: true });
            form.parse(req, (err, fields, files) => {
                if (err) return reject(err);
                resolve({ fields, files });
            });
        });
    } catch (err) {
        throw new Error("Form parsing failed: " + (err as Error).message);
    }
};

const COMPENDIUM_DIR = path.join(process.cwd(), 'public', 'compendium');

async function handler(req: NextApiRequest, res: NextApiResponse) {

    try {
        if (req.method === 'GET') {
            const companyId = parseInt(req.query.cid as string);
            if (isNaN(companyId)) {
                apiHelpers.badRequest(res, "Invalid Company ID")
                return;
            }

            try {
                const compendium = await prisma.company_Compendium.findUnique({
                    where: { company_id: companyId },
                    include: {
                        compedium_pdf: true,
                    },
                });

                if (compendium) {
                    const textPath = path.join(COMPENDIUM_DIR, `${companyId}.txt`);
                    const content = fs.existsSync(textPath) ? fs.readFileSync(textPath, 'utf-8') : '';

                    apiHelpers.success(res, { content, pdfs: compendium?.compedium_pdf })
                    return;
                } else {

                    const compe = await prisma.company_Compendium.create({
                        data: { company_id: companyId },
                        include: {
                            compedium_pdf: true,
                        },
                    });

                    const pdfs = compe?.compedium_pdf || [];
                    apiHelpers.created(res, { content: "", pdfs })
                    return;
                }

            } catch (err) {
                apiHelpers.error(res, "Couldn't fetch Compendium", 500, { error: err })
                return;
            }
        }

        if (req.method === 'PUT') {
            try {
                const { fields, files } = await parseForm(req);

                const companyId = parseInt(getFieldValue(fields.cid));
                const content = getFieldValue(fields.content);
                const totalNewEntries = parseInt(fields.total_new_entries as string);
                const totalDeleteEntries = parseInt(fields.total_deleted_entries as string)

                if (isNaN(companyId) || !content || isNaN(totalNewEntries) || isNaN(totalDeleteEntries)) {
                    apiHelpers.badRequest(res, "Missing Data")
                    return;
                }

                if (!fs.existsSync(COMPENDIUM_DIR)) {
                    fs.mkdirSync(COMPENDIUM_DIR, { recursive: true });
                }

                const txtPath = path.join(COMPENDIUM_DIR, `${companyId}.txt`);
                fs.writeFileSync(txtPath, content);

                const compendium = await prisma.company_Compendium.upsert({
                    where: { company_id: companyId },
                    update: {},
                    create: { company_id: companyId },
                });

                const deletePdfIds = []

                for (let i = 1; i <= totalDeleteEntries; i++) {
                    const rawDeleteID = fields[`pdf_deleted_id_${i}`];
                    const pdfId = parseInt(getFieldValue(rawDeleteID))
                    if (!isNaN(pdfId)) {
                        deletePdfIds.push(pdfId);
                    }
                }

                if (deletePdfIds.length > 0) {
                    const deletePdfs = await prisma.company_Compendium_Pdf_Path.findMany({
                        where: { compendium_id: compendium.id, id: { in: deletePdfIds } },
                    });

                    await Promise.all(
                        deletePdfs.map(async (pdf) => {
                            if (pdf.firebase_path) {
                                try {
                                    const file = bucket.file(pdf.firebase_path);
                                    await file.delete();
                                } catch (err) {
                                    console.warn(`Failed to delete file ${pdf.firebase_path}:`, err);
                                }
                            }
                        })
                    );

                    await prisma.company_Compendium_Pdf_Path.deleteMany({
                        where: {
                            compendium_id: compendium.id,
                            id: { in: deletePdfIds },
                        },
                    });
                }


                // Insert new files
                for (let i = 1; i <= totalNewEntries; i++) {
                    const rawFile = files[`pdf_new_file_${i}`];
                    const file = Array.isArray(rawFile) ? rawFile[0] : rawFile;
                    const nameField = fields[`pdf_new_name_${i}`];
                    const userProvidedName = Array.isArray(nameField) ? nameField[0] : nameField;

                    if (!file?.filepath || !userProvidedName) {
                        console.log(`No filepath or name provided for index ${i}`);
                    };

                    if (!fs.existsSync(file.filepath)) {
                        console.error(`Missing temp file for index ${i}:`, file.filepath);
                        continue;
                    }

                    const company = await prisma.company.findUnique({
                        where: { id: companyId },
                        select: { company_name: true },
                    });

                    if (!company) {
                        apiHelpers.badRequest(res, "Invalid Company ID")
                        return;
                    }

                    const sanitizedCompanyName = company.company_name
                        .toLowerCase()
                        .replace(/[^a-z0-9]/gi, "_")
                        .slice(0, 40);

                    const ext = path.extname(file.originalFilename ?? ".pdf");
                    const filename = `${companyId}-${Date.now()}-${i}${ext}`;
                    const firebasePath = `compendium/${sanitizedCompanyName}/${filename}`;
                      
                    try {
                        await bucket.upload(file.filepath, {
                            destination: firebasePath,
                            resumable: false,
                            predefinedAcl: 'private',
                            validation: 'crc32c',
                            metadata: {
                                contentType: file.mimetype || 'application/pdf',
                                cacheControl: 'private, max-age=0, no-transform',
                                customMetadata: {
                                    uploadedBy: "Placement Systems(IIML)",
                                    originalFilename: file.originalFilename || 'unknown',
                                    companyId: companyId.toString(),
                                    uploadTimestamp: new Date().toISOString(),
                                },
                            },
                        });


                        // const fileRef = bucket.file(firebasePath);
                        // await fileRef.makePublic();
                        // const publicUrl = fileRef.publicUrl();

                        const [url] = await bucket.file(firebasePath).getSignedUrl({
                            action: 'read',
                            expires: new Date('2030-12-31T23:59:59Z'),
                        });


                        await prisma.company_Compendium_Pdf_Path.create({
                            data: {
                                compendium_id: compendium.id,
                                pdf_path: url,
                                pdf_name: userProvidedName,
                                firebase_path: firebasePath,
                            },
                        });
                    } catch (err) {
                        console.error(`Failed to upload file ${file.originalFilename}:`, err);
                        continue;
                    }
                }

                return res.status(200).json({ message: 'Saved successfully', success: true });
            } catch (error) {
                console.error(error);
                return res.status(500).json({ error: 'Failed to update compendium', success: false });
            }
        }

    } catch (err: any) {
        console.error("Uncaught API error:", err.stack || err);
        return res.status(500).json({ error: 'Unexpected server error', success: false });
    }

}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);