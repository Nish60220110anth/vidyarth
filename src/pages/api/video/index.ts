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
import { ACCESS_PERMISSION, NOTIFICATION_SOURCE_INITIATOR, NOTIFICATION_SUBTYPE, NOTIFICATION_TYPE, VIDEO_REQ, VIDEO_STREAM_SOURCE } from "@prisma/client";
import { apiHelpers } from "@/lib/server/responseHelpers";
import { createNotification } from "@/lib/server/notificationSink";
import { generateSecureURL } from "@/utils/shared/secureUrlApi";
import { baseUrl } from "@/lib/config";
import { z } from "zod";
import { ToBool, ToInt, ToStr } from "@/lib/server/zod_utils";
import { createDefaultVideo, getVideoById, updateVideo } from "@/lib/server/services/video";

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

const PostQuerySchema = z.object({
    is_default: ToBool
}).strict();

const PutFormSchema = z
    .object({
        id: ToInt,
        company_id: ToInt,
        type: ToStr.transform((s) => s.toUpperCase()).pipe(z.enum(VIDEO_REQ)),
        source: ToStr.transform((s) => s.toUpperCase()).pipe(z.enum(VIDEO_STREAM_SOURCE)),
        title: ToStr,
        embed_id: ToStr,
        image_name: ToStr.optional(),
        is_featured: ToBool,
        keep_existing_image: ToBool,
        is_default: ToBool,
    })
    .strict();

const GetQuerySchema = z.object({
    cid: z.string().optional(),
}).strict();

const DeleteQuerySchema = z.object({
    id: ToInt.refine((val) => val > 0, {
        message: "Invalid video ID",
    }),
}).strict();

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "POST") {
        const { fields } = await parseForm(req);
        const parsedQuery = PostQuerySchema.safeParse(fields);

        if (!parsedQuery.success) {
            apiHelpers.badRequest(res, `Invalid query parameters: ${parsedQuery.error.message}`);
            return;
        }

        const { is_default } = parsedQuery.data;

        if (is_default !== true) {
            apiHelpers.badRequest(res, "is_default must be true to create a default video");
            return;
        }

        const defaultVideo = await createDefaultVideo();
        apiHelpers.success(res, { data: defaultVideo })
        return;
    }
    else if (req.method === "PUT") {
        const { fields, files } = await parseForm(req);

        const parsedForm = PutFormSchema.safeParse(fields);
        if (!parsedForm.success) {
            apiHelpers.badRequest(res, `Invalid form parameters: ${parsedForm.error.message}`);
            return;
        }

        const {
            id,
            company_id,
            type: video_type,
            source: video_source,
            title,
            embed_id,
            image_name,
            is_featured,
            keep_existing_image,
            is_default
        } = parsedForm.data;

        if (is_default) {
            apiHelpers.badRequest(res, "is_default cannot be true for PUT requests");
            return;
        }

        let image_path = "";
        let firebase_path = "";

        if (files.image && !keep_existing_image) {
            const file = files.image[0];
            const orig = file.originalFilename || "image.png"
            const dest = `thumbnails/${Date.now()}-${orig}`;
            const fileRef = bucket.file(dest);
            const fileBuffer = fs.readFileSync(file.filepath);

            await fileRef.save(fileBuffer, {
                metadata: {
                    contentType: file.mimetype || "image/png",
                },
            });

            await new Promise<void>((resolve, reject) => {
                fs.createReadStream(file.filepath)
                    .pipe(
                        fileRef.createWriteStream({
                            metadata: { contentType: file.mimetype || "image/png" },
                        })
                    )
                    .on("error", reject)
                    .on("finish", resolve);
            });

            // await file.makePublic(); - dude, use this when u want to make the link shorter

            // const publicUrl = file.publicUrl();
            // getting signed makes the file more private 

            const [signedUrl] = await fileRef.getSignedUrl({
                action: "read",
                expires: "03-01-2030",
            });

            image_path = signedUrl;
            firebase_path = dest;

            fs.promises.unlink(file.filepath).catch(() => { });
        }

        const oldVideo = await getVideoById(id);

        if (keep_existing_image) {

            await updateVideo(id, {
                company_id,
                type: video_type,
                source: video_source,
                title,
                embed_id,
                is_featured,
            });

            const refreshedVideo = await prisma.video.findUnique({
                where: { id },
                include: {
                    company: true,
                },
            });

            if (is_featured) {
                const secureUrlResp = await generateSecureURL("COMPANY", company_id)
                if (!secureUrlResp.success) {
                    apiHelpers.success(res, {
                        message: "Video updated successfully, but failed to generate secure URL.", error: secureUrlResp.error,
                        data: refreshedVideo
                    });
                    return;
                }

                createNotification({
                    type: NOTIFICATION_TYPE.COMPANY_CONTENT,
                    subtype: NOTIFICATION_SUBTYPE.VIDEO,
                    initiator: oldVideo?.is_featured ? NOTIFICATION_SOURCE_INITIATOR.UPDATED : NOTIFICATION_SOURCE_INITIATOR.ADDED,
                    companyId: company_id,
                    links: [{
                        link: `${baseUrl}/dashboard/?auth=${encodeURIComponent(secureUrlResp.url)}&tab=Videos`,
                        link_name: "recorded_videos"
                    }]
                });
            }

        } else {
            // delete existing thumbnail if exists

            if (oldVideo?.thumbnail_url && oldVideo.firebase_path) {
                const imageRef = bucket.file(oldVideo.firebase_path);
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

            const refreshedVideo = await prisma.video.findUnique({
                where: { id },
                include: {
                    company: true,
                },
            });

            if (is_featured) {

                const secureUrlResp = await generateSecureURL("COMPANY", company_id);
                if (!secureUrlResp.success) {
                    apiHelpers.success(res, {
                        message: "Video updated successfully, but failed to generate secure URL.",
                        error: secureUrlResp.error,
                        data: refreshedVideo
                    });
                    return;
                }

                createNotification({
                    type: NOTIFICATION_TYPE.COMPANY_CONTENT,
                    subtype: NOTIFICATION_SUBTYPE.VIDEO,
                    initiator: oldVideo?.is_featured ? NOTIFICATION_SOURCE_INITIATOR.UPDATED : NOTIFICATION_SOURCE_INITIATOR.ADDED,
                    companyId: company_id,
                    links: [{
                        link: `${baseUrl}/dashboard/?auth=${encodeURIComponent(secureUrlResp.url)}&tab=Videos`,
                        link_name: "recorded_videos"
                    }]
                });
            }
        }

        const refreshedVideo = await prisma.video.findUnique({
            where: { id },
            include: {
                company: true,
            },
        });

        apiHelpers.success(res, { data: refreshedVideo })
        return;
    }
    else if (req.method === "GET") {

        const permissionFilter = (req as any).filter ?? {};
        const filters: any = {
            ...permissionFilter
        };

        const parsedQuery = GetQuerySchema.safeParse(req.query);

        if (!parsedQuery.success) {
            apiHelpers.badRequest(res, `Invalid query parameters: ${parsedQuery.error.message}`);
            return;
        }

        if (parsedQuery.data.cid) {
            filters.company_id = parseInt(Array.isArray(parsedQuery.data.cid) ? parsedQuery.data.cid[0] : parsedQuery.data.cid);
        }

        const videos = await prisma.video.findMany({
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

        apiHelpers.success(res, { data: videos })
        return;
    }
    else if (req.method === "DELETE") {
        const parsedQuery = DeleteQuerySchema.safeParse(req.query);

        if (!parsedQuery.success) {
            apiHelpers.badRequest(res, `Invalid query parameters: ${parsedQuery.error.message}`);
            return;
        }

        const videoId = parsedQuery.data.id;

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

        if (video.is_featured) {
            const secureUrlResp = await generateSecureURL("COMPANY", video.company_id);
            if (secureUrlResp.success) {
                createNotification({
                    type: NOTIFICATION_TYPE.COMPANY_CONTENT,
                    subtype: NOTIFICATION_SUBTYPE.VIDEO,
                    initiator: NOTIFICATION_SOURCE_INITIATOR.DELETED,
                    companyId: video.company_id,
                    links: [{
                        link: `${baseUrl}/dashboard/?auth=${encodeURIComponent(secureUrlResp.url)}&tab=Videos`,
                        link_name: "recorded_videos"
                    }]
                });
            }
        }

        apiHelpers.success(res, {})
        return;
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);