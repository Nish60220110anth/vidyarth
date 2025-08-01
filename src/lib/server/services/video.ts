import { prisma } from "@/lib/prisma";

const createDefaultVideo = async () => {
    const defaultVideo = await prisma.video.create({
        data: {
            company_id: 0,
            title: "Default Video title",
            source: "YOUTUBE",
            thumbnail_url: "https://firebasestorage.googleapis.com/v0/b/vidyarth-systems.firebasestorage.app/o/thumbnails%2Fdefault-thumbnail.svg?alt=media&token=115891f2-e858-458b-bf7c-8a9d8a05f4be"
        },
        include:{
            company: true,
        }
    });

    return defaultVideo;
}

const getVideoById = async (id: number) => {
    const video = await prisma.video.findUniqueOrThrow({
        where: { id }
    });

    return video;
}


const updateVideo = async (id: number, data: any) => {
    const updatedVideo = await prisma.video.update({
        where: { id },
        data,
    });

    return updatedVideo;
}

export {
    createDefaultVideo,
    getVideoById,
    updateVideo
}