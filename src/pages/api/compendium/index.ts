// /pages/api/compendium/index.ts

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';
import { bucket } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import { MethodConfig, withPermissionCheck } from '@/lib/server/withPermissionCheck';
import { ACCESS_PERMISSION, NOTIFICATION_SOURCE_INITIATOR, NOTIFICATION_SUBTYPE, NOTIFICATION_TYPE } from '@prisma/client';
import { getFieldValue } from '@/utils/parseApiField';
import { apiHelpers } from '@/lib/server/responseHelpers';
import { createNotification } from '@/lib/server/notificationSink';
import { generateSecureURL } from '@/utils/shared/secureUrlApi';
import { defaultEmptyRichText } from '@/utils/defaultEmptyRichText';
import { baseUrl } from '@/lib/config';
import { z } from 'zod';
import { ToInt, ToStr } from '@/lib/server/zod_utils';
import { lexicalStateToHtml } from '@/utils/lexicalToHTML';

export const config = {
    api: {
        bodyParser: false,
    },
};

const SIZE_RESUMABLE_THRESHOLD = 5 * 1024 * 1024;

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

const COMPENDIUM_DIR = path.join(process.cwd(), 'public', 'content', 'compendium');

const GetQuerySchema = z.object({
    cid: ToInt.refine((val) => (val > 0), {
        message: "cid must be a positive integer",
    }),
}).strict();

const PutQuerySchema = z.object({
    cid: ToInt.refine((val) => (val > 0), {
        message: "cid must be a positive integer",
    }),
    content: ToStr,
    total_new_entries: ToInt.refine((val) => (val >= 0), {
        message: "total_new_entries must be a non-negative integer",
    }),
    total_deleted_entries: ToInt.refine((val) => (val >= 0), {
        message: "total_deleted_entries must be a non-negative integer",
    }),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {

    if (!fs.existsSync(COMPENDIUM_DIR)) {
        fs.mkdirSync(COMPENDIUM_DIR)
    }

    try {
        if (req.method === 'GET') {

            const parsedQuery = GetQuerySchema.safeParse(req.query);
            if (!parsedQuery.success) {
                apiHelpers.badRequest(res, "Invalid query parameters");
                return;
            }

            const companyId = parsedQuery.data.cid;

            try {
                const compendium = await prisma.company_compendium.findUnique({
                    where: { company_id: companyId },
                    include: {
                        compedium_pdf: true,
                    },
                });

                let content = "";
                const filePath = path.join(COMPENDIUM_DIR, `${companyId}.txt`);

                if (!fs.existsSync(filePath)) {
                    fs.writeFileSync(filePath, defaultEmptyRichText, 'utf-8');
                }

                content = fs.readFileSync(filePath, 'utf-8')

                if (compendium) {
                    apiHelpers.success(res, { content, pdfs: compendium?.compedium_pdf })
                    return;
                } else {

                    const compe = await prisma.company_compendium.create({
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
                console.error("Error fetching compendium:", err);
                apiHelpers.error(res, "Failed to fetch compendium", 500, { error: err });
                return;
            }
        }
        else if (req.method === 'PUT') {
            try {
                const { fields, files } = await parseForm(req);
                const parsedBody = PutQuerySchema.safeParse({
                    cid: fields.cid,
                    content: fields.content,
                    total_new_entries: parseInt(fields.total_new_entries, 10),
                    total_deleted_entries: parseInt(fields.total_deleted_entries, 10),
                });

                if (!parsedBody.success) {
                    apiHelpers.badRequest(res, `Invalid request body: ${JSON.stringify(parsedBody.error)}`);
                    return;
                }

                const { cid: companyId, content, total_new_entries, total_deleted_entries } = parsedBody.data;

                const txtPath = path.join(COMPENDIUM_DIR, `${companyId}.txt`);
                const compendium = await prisma.company_compendium.upsert({
                    where: { company_id: companyId },
                    update: {},
                    create: { company_id: companyId },
                });

                if (!fs.existsSync(txtPath) || !compendium) {
                    apiHelpers.error(res, "Compendium file not found", 404);
                    return;
                }

                fs.writeFileSync(txtPath, content);

                const htmlPath = path.join(COMPENDIUM_DIR, `${companyId}.html`);
                const htmlPromise = lexicalStateToHtml(content);
                const writeTxtPromise = fs.promises.writeFile(txtPath, content, 'utf-8');

                const htmlContent = await htmlPromise;
                await Promise.all([
                    writeTxtPromise,
                    fs.promises.writeFile(htmlPath, htmlContent, 'utf-8'),
                ]);

                const deletePdfIds = []

                for (let i = 1; i <= total_deleted_entries; i++) {
                    const rawDeleteID = fields[`pdf_deleted_id_${i}`];
                    const pdfId = parseInt(getFieldValue(rawDeleteID))
                    if (!isNaN(pdfId)) {
                        deletePdfIds.push(pdfId);
                    }
                }

                if (deletePdfIds.length > 0) {
                    const deletePdfs = await prisma.company_compendium_pdf_path.findMany({
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

                    await prisma.company_compendium_pdf_path.deleteMany({
                        where: {
                            compendium_id: compendium.id,
                            id: { in: deletePdfIds },
                        },
                    });
                }

                // Insert new files
                for (let i = 1; i <= total_new_entries; i++) {
                    const rawFile = files[`pdf_new_file_${i}`];
                    const file = Array.isArray(rawFile) ? rawFile[0] : rawFile;
                    const nameField = fields[`pdf_new_name_${i}`];
                    const userProvidedName: string = Array.isArray(nameField) ? nameField[0] : nameField;

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
                        .slice(0, 50);

                    const ext = path.extname(file.originalFilename ?? ".pdf");
                    const filename = `${companyId}-${i}-${Date.now().toLocaleString("en-IN")}${ext}`;
                    const firebasePath = `compendium/${sanitizedCompanyName}/${filename}`;

                    const size = Number(file.size ?? 0);
                    const safeFilename =
                        (file.originalFilename || "document.pdf").replace(/[^\w.\- ]+/g, "_");

                    try {
                        await bucket.upload(file.filepath, {
                            destination: firebasePath,
                            resumable: size >= SIZE_RESUMABLE_THRESHOLD,
                            validation: size >= SIZE_RESUMABLE_THRESHOLD ? "crc32c" : false,
                            gzip: false,
                            preconditionOpts: { ifGenerationMatch: 0 },
                            metadata: {
                                contentType: file.mimetype || "application/pdf",
                                cacheControl: "private, max-age=0, no-store, no-transform",
                                contentDisposition: `inline; filename="${safeFilename}"`,
                                metadata: {
                                    uploadedBy: "Placement Systems (IIML)",
                                    originalFilename: file.originalFilename || "unknown",
                                    companyId: String(companyId),
                                    uploadTimestamp: new Date().toISOString(),
                                    userProvidedName: userProvidedName || "Untitled",
                                },
                            },
                        });

                        // const fileRef = bucket.file(firebasePath);
                        // await fileRef.makePublic();
                        // const publicUrl = fileRef.publicUrl();

                        const [url] = await bucket.file(firebasePath).getSignedUrl({
                            action: 'read',
                            expires: new Date('2030-12-31T23:59:59Z'),
                            responseDisposition: `inline; filename="document.${ext}"`,
                        });

                        await prisma.company_compendium_pdf_path.create({
                            data: {
                                compendium_id: compendium.id,
                                pdf_path: url,
                                pdf_name: userProvidedName,
                                firebase_path: firebasePath,
                            },
                        });

                    } catch (err) {
                        console.error(`Failed to upload file ${file.originalFilename}:`, err);
                        apiHelpers.error(res, `Failed to upload file ${file.originalFilename}`, 500);
                        return;
                    }
                }

                const secureUrlResp = await generateSecureURL("COMPANY", companyId)

                if (secureUrlResp.success) {
                    createNotification({
                        type: NOTIFICATION_TYPE.COMPANY_CONTENT,
                        subtype: NOTIFICATION_SUBTYPE.COMPENDIUM,
                        initiator: NOTIFICATION_SOURCE_INITIATOR.UPDATED,
                        companyId: companyId,
                        links: [{
                            link: `${baseUrl}/dashboard/?auth=${encodeURIComponent(secureUrlResp.url)}&tab=Compendium`,
                            link_name: "compendium"
                        }]
                    });
                } else {
                    console.error(secureUrlResp.error);
                    apiHelpers.error(res, "Failed to generate secure URL for compendium");
                    return;
                }

                apiHelpers.success(res, {});
                return;
            } catch (error) {
                apiHelpers.error(res, "Failed to update compendium");
                console.error("Error in PUT handler:", error);
                return;
            }
        }

    } catch (err: any) {
        console.error("Uncaught API error:", err.stack || err);
        apiHelpers.error(res, "Internal server error", 500, { error: err.message || err });
        return;
    }

}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);