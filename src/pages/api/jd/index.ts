import { NextApiRequest, NextApiResponse } from "next";
import { DOMAIN, ACCESS_PERMISSION } from "@prisma/client";
import { bucket } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import formidable from "formidable";
import fs from "fs";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { apiHelpers } from "@/lib/server/responseHelpers";

export const config = {
    api: {
        bodyParser: false,
    },
};

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [
            ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY,
            ACCESS_PERMISSION.MANAGE_COMPANY_JD
        ],
        filters: {
            [ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY]: {
                priority: 1,
                filter: {
                    is_active: true,
                    placement_cycle: {
                        status: "OPEN"
                    }
                },
            },
            [ACCESS_PERMISSION.MANAGE_COMPANY_JD]: {
                priority: 1,
                filter: {},
            },
        },
    },
    put: {
        permissions: [ACCESS_PERMISSION.MANAGE_COMPANY_JD],
    },
    delete: {
        permissions: [ACCESS_PERMISSION.MANAGE_COMPANY_JD],
    },
    post: {
        permissions: [ACCESS_PERMISSION.MANAGE_COMPANY_JD],
    },
};

const parseForm = async (req: NextApiRequest): Promise<{ fields: any; files: any }> => {
    return new Promise((resolve, reject) => {
        const form = formidable({ multiples: false });
        form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            resolve({ fields, files });
        });
    });
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "POST") {
        try {
            const { fields } = await parseForm(req);
            const is_default = Array.isArray(fields.is_default) ? fields.is_default[0] : fields.is_default

            if (is_default !== true && is_default !== "true") {
                apiHelpers.badRequest(res, "Use PUT for main update")
                return;
            }

            const defaultJD = await prisma.company_JD.create({
                data: {
                    company_id: 0,
                    placement_cycle_id: 5,
                    role: "Enter Role",
                    pdf_path: "",
                    is_active: true,
                },
                include: {
                    company: true,
                    placement_cycle: true,
                    domains: true,
                },
            });

            await prisma.companyJD_Domain.create({
                data: {
                    company_jd_id: defaultJD.id,
                    domain: "FINANCE",
                },
            });

            const refreshedJD = await prisma.company_JD.findUnique({
                where: { id: defaultJD.id },
                include: {
                    company: true,
                    placement_cycle: true,
                    domains: true,
                },
            });

            apiHelpers.success(res, { refreshedJD })
            return;
        } catch (error) {
            console.error("Error creating default JD:", error);
            apiHelpers.error(res, "Failed to create default JD", 500)
            return;
        }
    }

    if (req.method === "PUT") {
        try {
            const { fields, files } = await parseForm(req);

            const {
                domains
            } = fields;

            const id = Array.isArray(fields.id) ? fields.id[0] : fields.id;
            const role = Array.isArray(fields.role) ? fields.role[0] : fields.role;
            const pdf_name = Array.isArray(fields.pdf_name) ? fields.pdf_name[0] : fields.pdf_name;
            const company_id = Array.isArray(fields.company_id) ? parseInt(fields.company_id[0]) : parseInt(fields.company_id);
            const placement_cycle_id = Array.isArray(fields.placement_cycle_id) ? parseInt(fields.placement_cycle_id[0]) : parseInt(fields.placement_cycle_id);
            const is_active = Array.isArray(fields.is_active) ? fields.is_active[0] === "true" : fields.is_active === "true";
            const keep_existing_pdf = Array.isArray(fields.keep_existing_pdf) ? fields.keep_existing_pdf[0] === "true" : fields.keep_existing_pdf === "true";

            if (!id || !company_id || !placement_cycle_id || !role) {
                apiHelpers.badRequest(res)
                return;
            }

            let pdf_path = "";
            let firebase_path = "";

            if (files.pdf) {
                const file = files.pdf[0];
                const fileBuffer = fs.readFileSync(file.filepath);

                firebase_path = `jds/${Date.now()}-${file.originalFilename}`;
                const fileRef = bucket.file(firebase_path);

                await fileRef.save(fileBuffer, {
                    metadata: {
                        contentType: file.mimetype || "application/pdf",
                    },
                });

                await fileRef.makePublic();

                const publicUrl = fileRef.publicUrl();
                // getting signed makes the file more private 

                // const [signedUrl] = await fileRef.getSignedUrl({
                //     action: "read",
                //     expires: "03-01-2030",
                // });

                pdf_path = publicUrl;
            }

            if (keep_existing_pdf) {
                await prisma.company_JD.update({
                    where: { id },
                    data: {
                        company_id,
                        placement_cycle_id,
                        role,
                        is_active
                    },
                });
            } else {
                await prisma.company_JD.update({
                    where: { id },
                    data: {
                        company_id,
                        placement_cycle_id,
                        role,
                        pdf_path,
                        is_active,
                        pdf_name,
                        firebase_path
                    },
                });
            }

            // Update domains
            await prisma.companyJD_Domain.deleteMany({
                where: { company_jd_id: id },
            });

            const domainList: DOMAIN[] = JSON.parse(domains);
            await prisma.companyJD_Domain.createMany({
                data: domainList.map((d) => ({
                    company_jd_id: id,
                    domain: d,
                })),
                skipDuplicates: true,
            });

            const refreshedJD = await prisma.company_JD.findUnique({
                where: { id },
                include: {
                    company: true,
                    placement_cycle: true,
                    domains: true,
                },
            });

            apiHelpers.success(res, { refreshedJD })
            return;
        } catch (error) {
            apiHelpers.error(res, "Failed to update JD", 500)
            return;
        }
    }

    if (req.method === "GET") {
        try {
            const { cid } = req.query;

            const permissionFilter = (req as any).filter ?? {};
            const filters: any = {
                ...permissionFilter
            };

            if (cid) {
                filters.company_id = parseInt(Array.isArray(cid) ? cid[0] : cid);
            }

            const allJDs = await prisma.company_JD.findMany({
                where: filters,
                include: {
                    company: {
                        include: {
                            domains: true,
                        },
                    },
                    placement_cycle: true,
                    domains: true,
                },
                orderBy: {
                    updated_at: "desc",
                },
            });

            apiHelpers.success(res, { allJDs })
            return;
        } catch (error) {
            console.error("Error fetching JDs:", error);
            apiHelpers.error(res, "Failed to fetch JD", 500)
            return;
        }
    }

    if (req.method === "DELETE") {
        try {
            const jdId = req.query.id;

            if (!jdId || typeof jdId !== "string") {
                apiHelpers.badRequest(res)
                return;
            }

            const jd = await prisma.company_JD.findUnique({
                where: { id: jdId },
            });

            if (!jd) {
                apiHelpers.notFound(res)
                return;
            }

            if (jd.firebase_path) {
                const fileRef = bucket.file(jd.firebase_path);
                try {
                    await fileRef.delete();
                } catch (err: any) {
                    console.warn("Failed to delete file from Firebase:", err.message);
                }
            }

            await prisma.companyJD_Domain.deleteMany({
                where: { company_jd_id: jdId },
            });

            await prisma.company_JD.delete({
                where: { id: jdId },
            });

            apiHelpers.success(res, {})
            return;
        } catch (err) {
            console.error("Error deleting JD:", err);
            apiHelpers.error(res, "Failed to delete JD")
            return;
        }
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);