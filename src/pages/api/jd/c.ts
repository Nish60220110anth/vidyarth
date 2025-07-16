import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, DOMAIN } from "@prisma/client";

const prisma = new PrismaClient();

export const config = {
    api: {
        bodyParser: false, // for handling file uploads
    },
};

import formidable from "formidable";
import fs from "fs";

// Utility to parse multipart form
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
            const { is_default } = req.body;

            if (is_default !== "true") {
                return res.status(400).json({ error: "Invalid request. Use PUT for main update." });
            }

            const defaultJD = await prisma.company_jd.create({
                data: {
                    company_id: 1, // Replace later
                    placement_cycle_id: 5, // Replace later
                    role: "New Role",
                    pdf_path: "",
                    is_active: true,
                },
                include: {
                    company: true,
                    placement_cycle: true,
                    domains: true,
                },
            });

            await prisma.companyjd_domain.create({
                data: {
                    company_jd_id: defaultJD.id,
                    domain: "FINANCE",
                },
            });

            const refreshedJD = await prisma.company_jd.findUnique({
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
            const company_id = Array.isArray(fields.company_id) ? parseInt(fields.company_id[0]) : parseInt(fields.company_id);
            const placement_cycle_id = Array.isArray(fields.placement_cycle_id) ? parseInt(fields.placement_cycle_id[0]) : parseInt(fields.placement_cycle_id);
            const is_active = Array.isArray(fields.is_active) ? fields.is_active[0] === "true" : fields.is_active === "true";
            const keep_existing_pdf = Array.isArray(fields.keep_existing_pdf) ? fields.keep_existing_pdf[0] === "true" : fields.keep_existing_pdf === "true";

            if (!id || !company_id || !placement_cycle_id || !role) {
                return res.status(400).json({ error: "Missing required fields" });
            }

            let pdf_path = "";

            if (files.pdf) {
                const file = files.pdf[0];
                const data = fs.readFileSync(file.filepath);

                const uploadPath = `./public/uploads/${file.originalFilename}`;
                fs.writeFileSync(uploadPath, data);

                pdf_path = `/uploads/${file.originalFilename}`;
            }

            if (keep_existing_pdf) {
               await prisma.company_jd.update({
                    where: { id },
                    data: {
                        company_id,
                        placement_cycle_id,
                        role,
                        is_active,
                    },
                });
            } else {
                await prisma.company_jd.update({
                    where: { id },
                    data: {
                        company_id,
                        placement_cycle_id,
                        role,
                        pdf_path,
                        is_active,
                    },
                });
            }

            // Update domains
            await prisma.companyjd_domain.deleteMany({
                where: { company_jd_id: id },
            });

            const domainList: DOMAIN[] = JSON.parse(domains);
            await prisma.companyjd_domain.createMany({
                data: domainList.map((d) => ({
                    company_jd_id: id,
                    domain: d,
                })),
                skipDuplicates: true,
            });

            const refreshedJD = await prisma.company_jd.findUnique({
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
            const allJDs = await prisma.company_jd.findMany({
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

    return res.status(405).json({ error: "Method not allowed" });
}
