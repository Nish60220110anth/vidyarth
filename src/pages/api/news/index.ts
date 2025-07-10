import type { NextApiRequest, NextApiResponse } from "next";
import { DOMAIN, NEWS_DOMAIN_TAG, NEWS_SUBDOMAIN_TAG, ACCESS_PERMISSION } from "@prisma/client";
import { getIronSession, IronSessionData } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { bucket } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
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
            ACCESS_PERMISSION.ENABLE_NEWS,
            ACCESS_PERMISSION.MANAGE_NEWS,
            ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
        ],
        filters: {
            [ACCESS_PERMISSION.MANAGE_NEWS]: {
                priority: 1,
                filter: {},
            },
            [ACCESS_PERMISSION.ENABLE_NEWS]: {
                priority: 2,
                filter: { is_active: true, is_approved: true },
            },
            [ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY]: {
                priority: 2,
                filter: {
                    is_approved: true,
                    is_active: true
                }
            }
        },
    },
    put: {
        permissions: [ACCESS_PERMISSION.MANAGE_NEWS],
    },
    delete: {
        permissions: [ACCESS_PERMISSION.MANAGE_NEWS],
    },
    post: {
        permissions: [ACCESS_PERMISSION.MANAGE_NEWS],
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

async function handler(
    req: ExtendedNextApiRequest,
    res: NextApiResponse
) {

    const session: IronSessionData = await getIronSession(req, res, sessionOptions);

    if (req.method === "GET") {
        try {
            const { domain, title, from, to, domain_tag, subdomain_tag, cid } = req.query;

            const permissionFilter = (req as any).filter ?? {};
            const filters: any = {
                ...permissionFilter,
            };

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

            const companyFilter =
                cid !== undefined
                    ? {
                        companies: {
                            some: {
                                company_id: parseInt(Array.isArray(cid) ? cid[0] : cid),
                            },
                        },
                    }
                    : {};

            const newsList = await prisma.news.findMany({
                where: {
                    ...filters,
                    ...(domain && domain !== "ALL" && {
                        domains: { some: { domain: domain as DOMAIN } },
                    }),
                    ...companyFilter

                },
                include: {
                    domains: true,
                    companies: {
                        include: {
                            company: true
                        }
                    },
                    author: { select: { name: true, email_id: true } },
                },
                orderBy: { created_at: "desc" },
            });

            apiHelpers.success(res, { newsList })
            return;

        } catch (err: any) {
            apiHelpers.error(res, "Failed to fetch news", 500, { error: err })
            return;
        }
    } else if (req.method === "DELETE") {
        const id = req.query.id;
        const newsId = String(id);

        if (!id) {
            apiHelpers.badRequest(res, "Invalid ID")
            return;
        }

        try {
            const existingNews = await prisma.news.findUnique({
                where: { id: newsId },
                select: { image_url: true, firebase_path: true },
            });

            await prisma.news_Domain.deleteMany({ where: { news_id: newsId } });
            await prisma.news_Company.deleteMany({ where: { news_id: newsId } });

            await prisma.news.delete({
                where: { id: newsId },
            });

            if (
                existingNews?.image_url &&
                existingNews?.firebase_path &&
                !existingNews.firebase_path.includes("default-image.png")
            ) {
                const fileRef = bucket.file(existingNews.firebase_path);
                try {
                    await fileRef.delete();
                } catch (err: any) {
                    console.warn("Failed to delete file from Firebase:", err.message);
                }
            }

            apiHelpers.success(res, {})
            return;

        } catch (err) {
            apiHelpers.error(res, "Internal server error", 500, { error: err })
            return;
        }
    } else if (req.method === "PUT") {
        try {
            const buffers: Uint8Array[] = [];
            for await (const chunk of req) buffers.push(chunk);
            const bodyString = Buffer.concat(buffers).toString();
            const parsedBody = JSON.parse(bodyString);

            const { id, title, content, is_active, is_approved, newsTag, subdomainTag, domains, companies, link_to_source } = parsedBody;

            if (!id) {
                apiHelpers.badRequest(res, "Invalid ID")
                return;
            }

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

            apiHelpers.success(res, { news })
            return;
        } catch (err: any) {
            apiHelpers.error(res, "Failed to update news", 500, { error: err })
            return;
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
                        title: "News Title",
                        content: "Enter your news content here",
                        link_to_source: "",
                        news_tag: "OTHER" as NEWS_DOMAIN_TAG,
                        subdomain_tag: "OTHER" as NEWS_SUBDOMAIN_TAG,
                        image_url: "https://firebasestorage.googleapis.com/v0/b/vidyarth-systems.firebasestorage.app/o/news-images%2Fdefault-image.png?alt=media&token=4732d312-560b-4b3f-91cd-538d6fcd9851",
                        firebase_path: "news-images/default-image.png",
                        is_active: true,
                        is_approved: false,
                        author_id: user?.id || 0,
                    },
                });

                apiHelpers.created(res, { news })
                return;
            } else {
                apiHelpers.forbidden(res)
                return;
            }
        } catch (err: any) {
            apiHelpers.error(res, "Couldn't create news entry", 500, { error: err })
            return;
        }
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);