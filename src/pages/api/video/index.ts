import { NextApiRequest, NextApiResponse } from "next";
import { bucket } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";

export const config = {
    api: {
        bodyParser: false,
    },
};

import formidable from "formidable";
import fs from "fs";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { ACCESS_PERMISSION, NOTIFICATION_SUBTYPE, NOTIFICATION_TYPE } from "@prisma/client";
import { apiHelpers } from "@/lib/server/responseHelpers";
import { createNotification } from "@/lib/server/notificationSink";
import { generateSecureURL } from "@/utils/shared/secureUrlApi";
import { baseUrl } from "@/pages/_app";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [
            ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY,
            ACCESS_PERMISSION.MANAGE_VIDEOS
        ],
        filters: {
            [ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY]: {
                priority: 2,
                filter: {
                    is_featured: true
                },
            },
            [ACCESS_PERMISSION.MANAGE_VIDEOS]: {
                priority: 1,
                filter: {},
            },
        },
    },
    put: {
        permissions: [ACCESS_PERMISSION.MANAGE_VIDEOS],
    },
    delete: {
        permissions: [ACCESS_PERMISSION.MANAGE_VIDEOS],
    },
    post: {
        permissions: [ACCESS_PERMISSION.MANAGE_VIDEOS],
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
                return res.status(400).json({ error: "Invalid request. Use PUT for main update." });
            }

            const defaultVideo = await prisma.video.create({
                data: {
                    company_id: 0,
                    title: "Default Video title",
                    source: "YOUTUBE",
                    thumbnail_url: "https://firebasestorage.googleapis.com/v0/b/vidyarth-systems.firebasestorage.app/o/thumbnails%2Fdefault-thumbnail.svg?alt=media&token=115891f2-e858-458b-bf7c-8a9d8a05f4be"
                },
                include: {
                    company: true
                },
            });

            const refreshVideo = await prisma.video.findUnique({
                where: { id: defaultVideo.id },
                include: {
                    company: true,
                },
            });

            apiHelpers.success(res, { refreshVideo })
            return;
        } catch (error) {
            apiHelpers.error(res, "Failed to create default video", 500)
            return;
        }
    }

    if (req.method === "PUT") {
        try {
            const { fields, files } = await parseForm(req);

            const id = Array.isArray(fields.id) ? parseInt(fields.id[0]) : parseInt(fields.id);
            const company_id = Array.isArray(fields.company_id) ? parseInt(fields.company_id[0]) : parseInt(fields.company_id);
            const video_type = Array.isArray(fields.type) ? fields.type[0] : fields.type;
            const video_source = Array.isArray(fields.source) ? fields.source[0] : fields.source;
            const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
            const embed_id = Array.isArray(fields.embed_id) ? fields.embed_id[0] : fields.embed_id;
            const image_name = Array.isArray(fields.image_name) ? fields.image_name[0] : fields.image_name;
            const is_featured = Array.isArray(fields.is_featured) ? fields.is_featured[0] === "true" : fields.is_featured === "true";
            const keep_existing_image = Array.isArray(fields.keep_existing_image) ? fields.keep_existing_image[0] === "true" : fields.keep_existing_image === "true";

            if (id == null || company_id == null || title == null) {
                apiHelpers.badRequest(res)
                return;
            }

            let image_path = "";
            let firebase_path = "";

            if (files.image) {
                const file = files.image[0];
                const fileBuffer = fs.readFileSync(file.filepath);

                firebase_path = `thumbnails/${Date.now()}-${file.originalFilename}`;
                const fileRef = bucket.file(firebase_path);

                await fileRef.save(fileBuffer, {
                    metadata: {
                        contentType: file.mimetype || "image/png",
                    },
                });

                // await file.makePublic(); - dude, use this when u want to make the link shorter

                // const publicUrl = file.publicUrl();
                // getting signed makes the file more private 

                const [signedUrl] = await fileRef.getSignedUrl({
                    action: "read",
                    expires: "03-01-2030",
                });

                image_path = signedUrl;
            }

            const oldVideo = await prisma.video.findUnique({
                where: {
                    id
                },
                select: {
                    is_featured: true
                }
            })

            if (keep_existing_image) {
                await prisma.video.update({
                    where: { id },
                    data: {
                        company_id,
                        type: video_type,
                        source: video_source,
                        title,
                        embed_id,
                        is_featured,
                    },
                });

                if (!oldVideo?.is_featured && is_featured) {
                    const secureUrlResp = await generateSecureURL("COMPANY", company_id)

                    if (secureUrlResp.success) {
                        createNotification({
                            type: NOTIFICATION_TYPE.CONTENT,
                            subtype: NOTIFICATION_SUBTYPE.UPDATED,
                            companyId: company_id,
                            links: [{
                                link: `${baseUrl}/dashboard/?auth=${encodeURIComponent(secureUrlResp.url)}&tab=Videos`,
                                link_name: "Recorded Videos"
                            }]
                        });
                    } else {
                        console.error(secureUrlResp.error)
                    }
                }

            } else {
                // delete existing thumbnail if exists
                const existingVideo = await prisma.video.findUnique({
                    where: { id },
                });

                if (existingVideo?.thumbnail_url && existingVideo.firebase_path) {
                    const imageRef = bucket.file(existingVideo.firebase_path);
                    await imageRef.delete();
                }

                await prisma.video.update({
                    where: { id },
                    data: {
                        company_id,
                        type: video_type,
                        source: video_source,
                        title,
                        embed_id,
                        thumbnail_image_name: image_name,
                        thumbnail_url: image_path,
                        is_featured,
                        firebase_path
                    },
                });

                if (!oldVideo?.is_featured && is_featured) {
                    const secureUrlResp = await generateSecureURL("COMPANY", company_id)

                    if (secureUrlResp.success) {
                        createNotification({
                            type: NOTIFICATION_TYPE.CONTENT,
                            subtype: NOTIFICATION_SUBTYPE.UPDATED,
                            companyId: company_id,
                            links: [{
                                link: `${baseUrl}/dashboard/?auth=${encodeURIComponent(secureUrlResp.url)}&tab=Videos`,
                                link_name: "Recorded Videos"
                            }]
                        });
                    } else {
                        console.error(secureUrlResp.error)
                    }
                }

            }

            const refreshedVideo = await prisma.video.findUnique({
                where: { id },
                include: {
                    company: true,
                },
            });

            apiHelpers.success(res, { refreshedVideo })
            return;
        } catch (error) {
            apiHelpers.error(res, "Failed to update video entry", 500)
            return;
        }
    }

    if (req.method === "GET") {

        const { cid } = req.query;

        const permissionFilter = (req as any).filter ?? {};
        const filters: any = {
            ...permissionFilter
        };

        if (cid) {
            filters.company_id = parseInt(Array.isArray(cid) ? cid[0] : cid);
        }
        try {
            const allVideos = await prisma.video.findMany({
                where: filters,
                include: {
                    company: {
                        include: {
                            domains: false,
                        },
                    }
                },
                orderBy: {
                    updated_at: "desc",
                },
            });

            apiHelpers.success(res, { allVideos })
            return;
        } catch (error) {
            apiHelpers.error(res, "Failed to fetch Videos", 500)
            return;
        }
    }

    if (req.method === "DELETE") {
        try {

            if (!req.query.id) {
                apiHelpers.badRequest(res, "Invalid or missing Video ID")
                return;
            };

            const videoId = Array.isArray(req.query.id) ? parseInt(req.query.id[0]) : parseInt(req.query.id);

            if (!videoId || typeof videoId !== "number") {
                apiHelpers.badRequest(res, "Invalid or missing Video ID")
                return;
            }

            const video = await prisma.video.findUnique({
                where: { id: videoId },
            });

            if (!video) {
                apiHelpers.notFound(res, "Video not found")
                return;
            }

            if (video.firebase_path) {
                const fileRef = bucket.file(video.firebase_path);
                try {
                    await fileRef.delete();
                } catch (err: any) {
                    console.warn("Failed to delete file from Firebase:", err.message);
                }
            }

            await prisma.video.delete({
                where: { id: videoId },
            });

            apiHelpers.success(res, {})
            return;
        } catch (err) {
            apiHelpers.error(res, "Failed to delete video", 500);
            return;
        }
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);