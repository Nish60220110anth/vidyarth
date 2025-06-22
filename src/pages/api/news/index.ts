import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, DOMAIN, NEWS_DOMAIN_TAG, NEWS_SUBDOMAIN_TAG } from "@prisma/client";
import formidable, { IncomingForm, File } from "formidable";
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
        id?: string;
        domain?: string;
        title?: string;
        from?: string;
        to?: string;
        is_active?: string;
        is_approved?: string;
    };
};

export default async function handler(
    req: ExtendedNextApiRequest,
    res: NextApiResponse
) {

    const session: IronSessionData = await getIronSession(req, res, sessionOptions);

    if (!session.email) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.method === "GET") {
        try {
            const { domain, title, from, to, is_active, is_approved, domain_tag, subdomain_tag } = req.query;

            const filters: any = {};
            if (is_active && is_active !== "ALL") filters.is_active = is_active === "true";
            if (is_approved && is_approved !== "ALL") filters.is_approved = is_approved === "true";

            if (title) {
                filters.OR = [
                    { title: { contains: String(title) } },
                    { content: { contains: String(title) } },
                ];
            }

            if (from || to) {
                filters.created_at = {};
                if (from) filters.created_at.gte = new Date(`${from}T00:00:00`);
                if (to) filters.created_at.lte = new Date(`${to}T23:59:59`);
            }

            if (domain_tag && domain_tag !== "ALL") {
                filters.news_tag = domain_tag as NEWS_DOMAIN_TAG;
            }

            if (subdomain_tag && subdomain_tag !== "ALL") {
                filters.subdomain_tag = subdomain_tag as NEWS_SUBDOMAIN_TAG;
            }

            const newsList = await prisma.news.findMany({
                where: {
                    ...filters,
                    domains: domain && domain !== "ALL" ? { some: { domain: domain as DOMAIN } } : undefined,
                },
                include: {
                    domains: true,
                    companies: { include: { company: true } },
                    author: { select: { name: true, email_id: true } },
                },
                orderBy: { created_at: "desc" },
            });

            return res.status(200).json({
                success: true,
                data: newsList
            });
        } catch (err) {
            console.error("GET /api/news failed:", err);
            return res.status(500).json({ error: "Internal server error", success: false });
        }
    } else if (req.method === "DELETE") {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: "Invalid ID", success: false });

        try {
            const existingNews = await prisma.news.findUnique({
                where: { id: String(id) },
                select: { path_to_image: true },
            });

            await prisma.news_Domain.deleteMany({ where: { news_id: String(id) } });
            await prisma.news_Company.deleteMany({ where: { news_id: String(id) } });


            await prisma.news.delete({
                where: { id: String(id) },
            });

            if (
                existingNews?.path_to_image &&
                !existingNews.path_to_image.includes("default-image.png")
            ) {
                const imagePath = path.join(process.cwd(), "public", existingNews.path_to_image);
                try {
                    unlink(imagePath);
                } catch (e) {
                    console.warn("Failed to delete image file:", e); // Non-fatal
                }
            }

            return res.status(200).json({ success: true });
        } catch (err) {
            console.error("DELETE /api/news failed:", err);
            return res.status(500).json({ error: "Internal server error", success: false });
        }
    } else if (req.method === "PUT") {
        try {
            const buffers: Uint8Array[] = [];
            for await (const chunk of req) buffers.push(chunk);
            const bodyString = Buffer.concat(buffers).toString();
            const parsedBody = JSON.parse(bodyString);

            const { id, title, content, is_active, is_approved, newsTag, subdomainTag, domains, companies, link_to_source } = parsedBody;

            if (!id) return res.status(400).json({ error: "ID is required", success: false });

            const news = await prisma.news.update({
                where: { id: String(id) },
                data: {
                    title,
                    content,
                    is_active,
                    is_approved,
                    news_tag: newsTag,
                    subdomain_tag: subdomainTag,
                    link_to_source: link_to_source || "",
                },
            });

            if (Array.isArray(domains)) {
                await prisma.news_Domain.deleteMany({ where: { news_id: String(id) } });
                await prisma.news_Domain.createMany({
                    data: domains.map((d: string) => ({
                        news_id: String(id),
                        domain: d as DOMAIN,
                    })),
                });
            }

            if (Array.isArray(companies)) {
                await prisma.news_Company.deleteMany({ where: { news_id: String(id) } });
                await prisma.news_Company.createMany({
                    data: companies.map((cid: string) => ({
                        news_id: String(id),
                        company_id: parseInt(cid),
                    })),
                });
            }

            return res.status(200).json({ success: true, news });
        } catch (err) {
            console.error("PUT /api/news failed:", err);
            return res.status(500).json({ error: "Failed to update news", success: false });
        }
    } else if (req.method === "POST") {

        try {
            let is_default = false;

            if (req.headers["content-type"]?.includes("application/json")) {
                const buffers: Uint8Array[] = [];
                for await (const chunk of req) {
                    buffers.push(chunk);
                }
                const rawBody = Buffer.concat(buffers).toString();
                const parsed = JSON.parse(rawBody);
                is_default = parsed.is_default;
            }

            if (is_default) {
                const user = await prisma.user.findUnique({
                    where: { email_id: session.email },
                    select: { id: true },
                });

                const news = await prisma.news.create({
                    data: {
                        title: "Untitled News",
                        content: "This is a default news entry.",
                        link_to_source: "",
                        news_tag: "OTHER" as NEWS_DOMAIN_TAG,
                        subdomain_tag: "OTHER" as NEWS_SUBDOMAIN_TAG,
                        path_to_image: "/news-images/default-image.png",
                        is_active: true,
                        is_approved: false,
                        author_id: user?.id || 0,
                    },
                });

                return res.status(201).json({ success: true, news });
            } else {
                return res.status(400).json({ error: "Under Progress", success: false });
            }
        } catch (err) {

            return res.status(500).json({ error: "Internal server error", success: false });
        }
    }

    else {
        return res.status(405).json({ error: "Method not allowed", success: false });
    }
}
