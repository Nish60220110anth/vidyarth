// pages/api/sink-shortlist.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Cors from "cors";
import { prisma } from "../../lib/prisma";
import { createNotification } from "@/lib/server/notificationSink";
import {
    NOTIFICATION_SOURCE_INITIATOR,
    NOTIFICATION_SUBTYPE,
    NOTIFICATION_TYPE,
    SHORTLIST_TYPE,
} from "@prisma/client";
import { generateSecureURL } from "@/utils/shared/secureUrlApi";
import { baseUrl, chitraguptaUrl } from "@/lib/config";

// Configure CORS to only allow your Chitragupta front-end origin
const cors = Cors({
    origin: process.env.NEXT_PUBLIC_CHITRAGUPTA_URL,
    methods: ["POST", "OPTIONS"],
    credentials: true,
});

// Helper to run middleware in Next.js API routes
function runMiddleware(
    req: NextApiRequest,
    res: NextApiResponse,
    fn: any
) {
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
    sl_type: string;
    company_id: number;
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

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Apply CORS
    await runMiddleware(req, res, cors);

    if (req.method === "OPTIONS") {
        // Preflight
        res.status(200).end();
        return;
    }

    if (req.method !== "POST") {
        // Reject any non-POST after CORS
        res.status(405).json({ error: "Method not allowed" });
        return;
    }

    const data = req.body as Array<{
        shortlist_id: number;
        shortlist_type: string;
        round_details: string;
        round_type: string;
        day: number;
        updated_at: string;
        company_name: string;
        company_role: string;
        pcom_id: number;
    }>;

    const results: ShortlistInsertResult = {
        inserted: [],
        skipped: [],
        errors: [],
    };

    // 1) Gather all distinct shortlist_ids from the incoming batch
    const shortlistIds = Array.from(
        new Set(data.map((entry) => entry.shortlist_id))
    );

    // 2) Delete any existing rows for *any* of these shortlist_ids
    //    so you start fresh for each batch
    await prisma.shortlist.deleteMany({
        where: { shortlist_id: { in: shortlistIds } },
    });

    // 3) Process each incoming entry
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
            pcom_id,
        } = entry;

        try {
            // Find matching company by name or full name
            const company = await prisma.company.findFirst({
                where: {
                    OR: [{ company_name }, { company_full: company_name }],
                },
            });

            // Find the active, verified user by their PCOM ID
            const student = await prisma.user.findFirst({
                where: {
                    pcomid: String(pcom_id),
                    is_active: true,
                    is_verified: true,
                },
            });

            if (!company || !student) {
                // Skip if either side is missing
                results.skipped.push({
                    reason: "Company or user not found",
                    pcom_id,
                    company_name,
                });
                continue;
            }

            // 4) Upsert a single shortlist row per (shortlist_id, company_id)
            //    - create on first occurrence (and connect first student)
            //    - update on subsequent ones (connecting additional students)
            const upserted = await prisma.shortlist.upsert({
                where: {
                    shortlist_unique_pair: {
                        shortlist_id,
                        company_id: company.id,
                    },
                },
                create: {
                    shortlist_id,
                    company_id: company.id,
                    round_details,
                    shortlist_type: shortlist_type === "SL" ? SHORTLIST_TYPE.SL : SHORTLIST_TYPE.ESL,
                    round_type,
                    day,
                    role: company_role,
                    is_active: true,
                    is_featured: false,
                    updated_at: new Date(updated_at),
                    shortlisted_users: {
                        connect: { id: student.id },
                    },
                },
                update: {
                    // Each new pass simply connects another student
                    shortlisted_users: {
                        connect: { id: student.id },
                    },
                    // Refresh timestamp if needed
                    updated_at: new Date(updated_at),
                },
            });

            // Record successful upsert
            results.inserted.push({
                id: upserted.id,
                company_name,
                pcom_id,
                sl_type: upserted.shortlist_type,
                role: company_role,
                company_id: company.id,
            });
        } catch (err: any) {
            // Capture any unexpected errors
            results.errors.push({
                pcom_id,
                company_name,
                error: err.message,
            });
        }
    }

    // 5) Send notifications for each newly upserted row
    for (const entry of results.inserted) {
        const secureUrlMy = await generateSecureURL("MY_SECTION", 0);
        const secureUrlComp = await generateSecureURL(
            "COMPANY",
            entry.company_id
        );

        if (secureUrlMy.success && secureUrlComp.success) {
            createNotification({
                type: NOTIFICATION_TYPE.SHORTLIST,
                subtype:
                    entry.sl_type === "SL"
                        ? NOTIFICATION_SUBTYPE.SL
                        : NOTIFICATION_SUBTYPE.ESL,
                initiator: NOTIFICATION_SOURCE_INITIATOR.PUBLISHED,
                shortlistId: entry.id,
                links: [
                    {
                        link: `${baseUrl}/dashboard/?auth=${encodeURIComponent(
                            secureUrlMy.url
                        )}&tab=My+Section`,
                        link_name: "my_section_link",
                    },
                    {
                        link: `${baseUrl}/dashboard/?auth=${encodeURIComponent(
                            secureUrlComp.url
                        )}&tab=Summary`,
                        link_name: "company_link",
                    },
                ],
            });
        } else {
            // Log any URL-generation failures for debugging
            if (!secureUrlComp.success)
                console.error("COMPANY URL error:", secureUrlComp.error);
            if (!secureUrlMy.success)
                console.error("MY_SECTION URL error:", secureUrlMy.error);
        }
    }

    // 6) Return the summary of what was inserted, skipped, or errored
    res.status(200).json({ success: true, summary: results });
}
