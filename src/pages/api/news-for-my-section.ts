import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, DOMAIN, NEWS_DOMAIN_TAG, NEWS_SUBDOMAIN_TAG } from "@prisma/client";
import { getIronSession, IronSessionData } from "iron-session";
import { sessionOptions } from "@/lib/session";
import path from "path";
import { unlink } from "fs/promises";

const prisma = new PrismaClient();

export const config = {
    api: {
        bodyParser: false,
    },
};

type ExtendedNextApiRequest = NextApiRequest & {
    query: {
        company_name: string;
    };
};

export default async function handler(
    req: ExtendedNextApiRequest,
    res: NextApiResponse
) {

    const session: IronSessionData = await getIronSession(req, res, sessionOptions);

    // if (!session.email) {
    //     return res.status(401).json({ error: "Unauthorized" });
    // }

    if (req.method === "GET") {
        try {
            const { cid } = req.query;

            // Normalize cid into a number array
            const companyIds = Array.isArray(cid)
                ? cid.map((id) => parseInt(id))
                : cid
                    ? [parseInt(cid)]
                    : [];

            const companyFilter =
                companyIds.length > 0
                    ? {
                        companies: {
                            some: {
                                company_id: {
                                    in: companyIds,
                                },
                            },
                        },
                    }
                    : {};

            const newsList = await prisma.news.findMany({
                where: {
                    ...companyFilter,
                    is_active: true,
                    is_approved: true,
                },
                include: {
                    domains: true,
                    companies: {
                        include: {
                            company: true,
                        },
                    },
                },
                orderBy: { created_at: "desc" },
            });

            return res.status(200).json({
                success: true,
                data: newsList,
            });
        } catch (err) {
            console.error("GET /api/news-for-my-section failed:", err);
            return res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }

    }

    else {
        return res.status(405).json({ error: "Method not allowed", success: false });
    }
}
