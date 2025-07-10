// pages/api/sink-shortlist.ts

import type { NextApiRequest, NextApiResponse } from "next";
import Cors from "cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Init middleware
const cors = Cors({
    origin: "http://localhost:5173",
    methods: ["POST", "OPTIONS"],
    credentials: true
});

function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: any) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result: any) => {
            return result instanceof Error ? reject(result) : resolve(result);
        });
    });
}

type InsertedShortlist = {
    id: number;
    company_name: string;
    pcom_id: number;
    role: string;
};

type SkippedShortlist = {
    reason: string;
    pcom_id: number;
    company_name: string;
};

type ErrorShortlist = {
    pcom_id: number;
    company_name: string;
    error: string;
};

type ShortlistInsertResult = {
    inserted: InsertedShortlist[];
    skipped: SkippedShortlist[];
    errors: ErrorShortlist[];
};



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await runMiddleware(req, res, cors);

    if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
    }

    if (req.method === "POST") {
        const data = req.body;

        const results: ShortlistInsertResult = {
            inserted: [],
            skipped: [],
            errors: [],
        };

        const { shortlist_id } = data[0];

        await prisma.shortlist.deleteMany({
            where: {
                // company_id: company.id,
                // round_details,
                // shortlist_type,
                // round_type,
                // day,
                // role: company_role,
                shortlist_id: shortlist_id ? shortlist_id : undefined,
            },
        });


        for (const entry of data) {
            const {
                shortlist_id,
                shortlist_type,
                round_details,
                round_type,
                day,
                updated_at,
                company_name,
                company_role,
                name,
                pcom_id,
            } = entry;

            try {
                const company = await prisma.company.findFirst({
                    where: {
                        OR: [
                            {
                                company_name
                            },
                            {
                                company_full: company_name
                            }
                        ]
                    },
                });

                const student = await prisma.user.findFirst({
                    where: {
                        pcomid: String(pcom_id),
                        is_active: true,
                        is_verified: true,
                    },
                });

                if (!company) {
                    results.skipped.push({
                        reason: 'Company or user not found',
                        pcom_id,
                        company_name,
                    });
                    continue;
                }

                const shortlist = await prisma.shortlist.create({
                    data: {
                        shortlist_id,
                        company_id: company.id,
                        round_details,
                        shortlist_type,
                        round_type,
                        day,
                        role: company_role,
                        is_active: true,
                        is_featured: false,
                        updated_at,
                        shortlisted_users: {
                            connect: { id: student?.id }
                        },
                    },
                });

                results.inserted.push({
                    id: shortlist.id,
                    company_name,
                    pcom_id,
                    role: company_role,
                });
            } catch (err: any) {
                results.errors.push({
                    pcom_id,
                    company_name,
                    error: err.message,
                });
            }
        }

        res.status(200).json({
            success: true,
            summary: results,
        });

        return;
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}
