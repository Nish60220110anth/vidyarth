import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, DOMAIN } from "@prisma/client";
import { bucket } from "@/lib/firebase-admin";

const prisma = new PrismaClient();

export const config = {
    api: {
        bodyParser: false,
    },
};

import formidable from "formidable";
import fs from "fs";


const parseForm = async (req: NextApiRequest): Promise<{ fields: any; files: any }> => {
    return new Promise((resolve, reject) => {
        const form = formidable({ multiples: false });
        form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            resolve({ fields, files });
        });
    });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "POST") {
        try {
            const { fields, files } = await parseForm(req);
            console.log(fields)

            const is_default = Array.isArray(fields.is_default) ? fields.is_default[0] : fields.is_default

            if (is_default !== true && is_default !== "true") {
                return res.status(400).json({ error: "Invalid request. Use PUT for main update." });
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

            return res.status(200).json(refreshedJD);
        } catch (error) {
            console.error("Error creating default JD:", error);
            return res.status(500).json({ error: "Failed to create default JD" });
        }
    }

    if (req.method === "PUT") {
        try {
            const { fields, files } = await parseForm(req);

            const {
                domains,
                is_default, // ignored in PUT but accepted for safety
            } = fields;

            const id = Array.isArray(fields.id) ? fields.id[0] : fields.id;
            const role = Array.isArray(fields.role) ? fields.role[0] : fields.role;
            const pdf_name = Array.isArray(fields.pdf_name) ? fields.pdf_name[0] : fields.pdf_name;
            const company_id = Array.isArray(fields.company_id) ? parseInt(fields.company_id[0]) : parseInt(fields.company_id);
            const placement_cycle_id = Array.isArray(fields.placement_cycle_id) ? parseInt(fields.placement_cycle_id[0]) : parseInt(fields.placement_cycle_id);
            const is_active = Array.isArray(fields.is_active) ? fields.is_active[0] === "true" : fields.is_active === "true";
            const keep_existing_pdf = Array.isArray(fields.keep_existing_pdf) ? fields.keep_existing_pdf[0] === "true" : fields.keep_existing_pdf === "true";

            if (!id || !company_id || !placement_cycle_id || !role) {
                return res.status(400).json({ error: "Missing required fields" });
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

            return res.status(200).json(refreshedJD);
        } catch (error) {
            console.error("Error updating JD:", error);
            return res.status(500).json({ error: "Failed to update JD" });
        }
    }

    if (req.method === "GET") {
        try {
            const { cid, status, active } = req.query;

            const filters: any = {
            };

            if (cid) {
                filters.company_id = parseInt(Array.isArray(cid) ? cid[0] : cid);
            }

            if (status === "OPEN" || status === "CLOSED") {
                filters.placement_cycle = {
                    status: status.toUpperCase(),
                };
            }

            if(active) {
                filters.is_active = active === "true";
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
    
            return res.status(200).json(allJDs);
        } catch (error) {
            console.error("Error fetching JDs:", error);
            return res.status(500).json({ error: "Failed to fetch JDs" });
        }
    }
    

    if (req.method === "DELETE") {
        try {
            const jdId = req.query.id;

            if (!jdId || typeof jdId !== "string") {
                return res.status(400).json({ error: "Invalid or missing JD ID" });
            }

            const jd = await prisma.company_JD.findUnique({
                where: { id: jdId },
            });

            if (!jd) {
                return res.status(404).json({ error: "JD not found" });
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

            return res.status(200).json({ success: true, message: "JD deleted successfully" });
        } catch (err) {
            console.error("Error deleting JD:", err);
            return res.status(500).json({ error: "Failed to delete JD" });
        }
    }
    
    return res.status(405).json({ error: "Method not allowed" });
}
