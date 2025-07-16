import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getIronSession, IronSession, IronSessionData } from "iron-session";
import { sessionOptions } from "@/lib/session";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session: IronSession<IronSessionData> = await getIronSession(req, res, sessionOptions);

    if (!session || (session.role !== "ADMIN" && session.role !== "DISHA")) {
        return res.status(403).json({ error: "Unauthorized" });
    }

    if (req.method !== "PUT") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { studentId, dishaId, shadowPcomId } = req.body;
    const studentNumId = Number(studentId);
    let updatedShadowUser = null;
    let removedShadowUser = null;

    try {
        const openCycle = await prisma.placement_cycle.findFirst({
            where: { status: "OPEN" },
            select: { id: true },
        });

        if (!openCycle) {
            return res.status(400).json({ error: "No open placement cycle found" });
        }

        // ======================
        // DISHA MENTOR ASSIGNMENT
        // ======================
        if (typeof dishaId === "number") {
            const validDisha = await prisma.user.findUnique({
                where: { id: dishaId },
                select: { id: true },
            });

            if (validDisha) {
                await prisma.user.update({
                    where: { id: studentNumId },
                    data: {
                        disha_profile: {
                            upsert: {
                                update: { mentor: { connect: { id: dishaId } } },
                                create: {
                                    mentor: { connect: { id: dishaId } },
                                    placement_cycle: { connect: { id: openCycle.id } },
                                },
                            },
                        },
                    },
                });
            } else {
                await prisma.dishamentee.deleteMany({ where: { user_id: studentNumId } });
            }
        } else {
            await prisma.dishamentee.deleteMany({ where: { user_id: studentNumId } });
        }

        // ======================
        // SHADOW PAIR ASSIGNMENT
        // ======================

        const trimmedShadowPcomId = shadowPcomId?.trim();

        const existingPair = await prisma.shadowpair.findFirst({
            where: {
                OR: [
                    { user1Id: studentNumId },
                    { user2Id: studentNumId },
                ],
            },
            select: { user1Id: true, user2Id: true },
        });

        // Case 1: Shadow is removed
        if (!trimmedShadowPcomId) {
            if (existingPair) {
                const otherUserId =
                    existingPair.user1Id === studentNumId ? existingPair.user2Id : existingPair.user1Id;

                removedShadowUser = await prisma.user.findUnique({
                    where: { id: otherUserId },
                    select: { id: true, name: true, pcomid: true },
                });

                await prisma.shadowpair.deleteMany({
                    where: {
                        OR: [
                            { user1Id: studentNumId },
                            { user2Id: studentNumId },
                        ],
                    },
                });
            }

            return res.status(200).json({
                success: true,
                updatedShadowUser,
                removedShadowUser,
            });
        }

        // Case 2: Shadow is assigned
        const shadowUser = await prisma.user.findFirst({
            where: { pcomid: trimmedShadowPcomId },
            select: { id: true, name: true, pcomid: true },
        });

        if (!shadowUser) {
            return res.status(200).json({ success: true, updatedShadowUser, removedShadowUser });
        }

        const [studentProfile, shadowProfile] = await Promise.all([
            prisma.dishamentee.findFirst({ where: { user_id: studentNumId }, select: { mentor_id: true } }),
            prisma.dishamentee.findFirst({ where: { user_id: shadowUser.id }, select: { mentor_id: true } }),
        ]);

        if (!studentProfile || !shadowProfile) {
            return res.status(400).json({ error: "Both users must have a DISHA mentor assigned" });
        }

        if (studentProfile.mentor_id !== shadowProfile.mentor_id) {
            return res.status(400).json({
                error: "Both students must have the same DISHA mentor to assign a shadow",
            });
        }

        const shadowAlreadyUsed = await prisma.shadowpair.findFirst({
            where: {
                OR: [
                    { user1Id: shadowUser.id },
                    { user2Id: shadowUser.id },
                ],
            },
        });

        if (shadowAlreadyUsed && (
            shadowAlreadyUsed.user1Id !== studentNumId &&
            shadowAlreadyUsed.user2Id !== studentNumId
        )) {
            return res.status(400).json({
                error: "This shadow is already assigned to someone else",
            });
        }

        if (
            !existingPair ||
            (existingPair.user1Id !== shadowUser.id && existingPair.user2Id !== shadowUser.id)
        ) {
            if (existingPair) {
                const oldShadowId =
                    existingPair.user1Id === studentNumId ? existingPair.user2Id : existingPair.user1Id;

                removedShadowUser = await prisma.user.findUnique({
                    where: { id: oldShadowId },
                    select: { id: true, name: true, pcomid: true },
                });

                await prisma.shadowpair.deleteMany({
                    where: {
                        OR: [
                            { user1Id: studentNumId },
                            { user2Id: studentNumId },
                        ],
                    },
                });
            }

            await prisma.shadowpair.create({
                data: {
                    user1: { connect: { id: shadowUser.id } },
                    user2: { connect: { id: studentNumId } },
                },
            });

            updatedShadowUser = shadowUser;
        }

        return res.status(200).json({
            success: true,
            updatedShadowUser,
            removedShadowUser,
        });

    } catch (err) {
        console.error("Update cohort error:", err);
        return res.status(500).json({ error: "Failed to update cohort" });
    }
}
