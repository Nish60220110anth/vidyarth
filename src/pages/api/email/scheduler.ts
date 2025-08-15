import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import axios from "axios";
import { renderTemplate } from "@/utils/emailTemplate";
import { toTitleCase } from "@/components/Profile";
import { baseUrl } from "@/lib/config";
import { ACCESS_PERMISSION } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const now = new Date();

        const dueRecipients = await prisma.email_recipient_state.findMany({
            where: {},
            include: {
                email_content: {
                    include: {
                        cc: true,
                        bcc: true,
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email_id: true,
                        pcomid: true
                    }
                }
            }
        });

        const toDeleteIds: number[] = [];

        for (const entry of dueRecipients) {
            const readyAt = new Date(entry.updated_at.getTime() + entry.delay_minutes * 60000);
            if (readyAt > now) continue;

            const { user, email_content } = entry;

            const personalizedBody = renderTemplate(email_content.content, {
                name: toTitleCase(user.name),
                pcom_id: user.pcomid || "N/A",
            });

            const emailPayload = {
                admin: "Vidyarth",
                to: [user.email_id],
                cc: email_content.cc.map(cc => cc.email_id),
                bcc: email_content.bcc.map(bcc => bcc.email_id),
                subject: email_content.title,
                html: personalizedBody,
                notificationIds: []
            };

            const response = await axios.post(`${baseUrl}/api/email`, emailPayload, {
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.MANAGE_EMAIL
                }
            });

            if (response.data?.success) {
                toDeleteIds.push(entry.id);
            }
        }

        if (toDeleteIds.length > 0) {
            await prisma.email_recipient_state.deleteMany({
                where: {
                    id: { in: toDeleteIds }
                }
            });
        }

        return res.status(200).json({
            success: true,
            sent: toDeleteIds.length,
            deletedIds: toDeleteIds
        });

    } catch (error) {
        console.error("Scheduler error:", error);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
}
