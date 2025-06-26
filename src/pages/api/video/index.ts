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

            const is_default = Array.isArray(fields.is_default) ? fields.is_default[0] : fields.is_default

            if (is_default !== true && is_default !== "true") {
                return res.status(400).json({ error: "Invalid request. Use PUT for main update." });
            }

            const defaultVideo = await prisma.video.create({
                data: {
                    company_id: 0,
                    title: "default video title",
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

            return res.status(200).json(refreshVideo);
        } catch (error) {
            console.error("Error creating default video:", error);
            return res.status(500).json({ error: "Failed to create default video" });
        }
    }

    if (req.method === "PUT") {
        try {
            const { fields, files } = await parseForm(req);

            const {
                is_default,
            } = fields;

            const id = Array.isArray(fields.id) ? parseInt(fields.id[0]) : parseInt(fields.id);
            const company_id = Array.isArray(fields.company_id) ? parseInt(fields.company_id[0]) : parseInt(fields.company_id);
            const video_type = Array.isArray(fields.type) ? fields.type[0] : fields.type;
            const video_source = Array.isArray(fields.stream_source) ? fields.stream_source[0] : fields.stream_source;
            const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
            const embed_id = Array.isArray(fields.embed_id) ? fields.embed_id[0] : fields.embed_id;
            const image_name = Array.isArray(fields.image_name) ? fields.image_name[0] : fields.image_name;
            const is_featured = Array.isArray(fields.is_featured) ? fields.is_featured[0] === "true" : fields.is_featured === "true";
            const keep_existing_image = Array.isArray(fields.keep_existing_image) ? fields.keep_existing_image[0] === "true" : fields.keep_existing_image === "true";
            
            if (id == null || company_id == null || title == null) {
                return res.status(400).json({ error: "Missing required fields" });
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
            } else {
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
                    },
                });
            }

            const refreshedVideo = await prisma.video.findUnique({
                where: { id },
                include: {
                    company: true,
                },
            });

            return res.status(200).json(refreshedVideo);
        } catch (error) {
            console.error("Error updating video entry:", error);
            return res.status(500).json({ error: "Failed to update video entry" });
        }
    }

    if (req.method === "GET") {
        try {
            const allVideos = await prisma.video.findMany({
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

            return res.status(200).json(allVideos);
        } catch (error) {
            console.error("Error fetching Videos:", error);
            return res.status(500).json({ error: "Failed to fetch Videos" });
        }
    }

    if (req.method === "DELETE") {
        try {
            
            if (!req.query.id) {
                return res.status(400).json({ error: "Invalid or missing Video ID" });
            };

            const videoId = Array.isArray(req.query.id) ? parseInt(req.query.id[0]) : parseInt(req.query.id);

            if (!videoId || typeof videoId !== "number") {
                return res.status(400).json({ error: "Invalid or missing Video ID" });
            }

            const video = await prisma.video.findUnique({
                where: { id: videoId },
            });

            if (!video) {
                return res.status(404).json({ error: "video not found" });
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

            return res.status(200).json({ success: true, message: "Video deleted successfully" });
        } catch (err) {
            console.error("Error deleting Video:", err);
            return res.status(500).json({ error: "Failed to delete video" });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
