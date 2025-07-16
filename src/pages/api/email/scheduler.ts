import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { baseUrl } from "@/pages/_app";
import { renderTemplate } from "@/utils/emailTemplate";
import { toTitleCase } from "@/components/Profile";
import { prisma } from "@/lib/prisma";
import { ACCESS_PERMISSION } from "@prisma/client";

type RefinedEntry = {
    to: string[];
    cc: string[];
    bcc: {
        pcomid: string;
        name: string;
        emailid: string;
        id: number;
    }[];
    subject: string;
    body: string;
    delay: number;
    type: string;
    brief: string;
    where_to_look: string;
    is_link: boolean;
    link_name: string;
    notificationIds: number[];
};

type PersonalizedEmail = {
    to: string[];
    cc: string[];
    bcc: string,
    subject: string;
    html: string;
    delay: number;
    notificationIdList: number[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const refinerResponse = await axios.post(`${baseUrl}/api/email/refiner`);
        const refinedData: RefinedEntry[] = refinerResponse.data?.data || [];

        const emailsToSend: PersonalizedEmail[] = [];

        for (const entry of refinedData) {
            const { to, cc, bcc, subject, body, delay, notificationIds, brief, is_link, where_to_look, link_name } = entry;

            for (const person of bcc) {
                const personalizedBody = renderTemplate(body, {
                    pcom_id: person.pcomid,
                    name: toTitleCase(person.name),
                });

                emailsToSend.push({
                    to,
                    cc,
                    bcc: person.emailid,
                    subject,
                    html: personalizedBody,
                    delay,
                    notificationIdList: notificationIds
                });

                const res = await axios.post(`${baseUrl}/api/email`, {
                    to,
                    cc,
                    bcc: person.emailid,
                    subject,
                    html: personalizedBody,
                    admin: "Vidyarth",
                    notificationIds
                }, {
                    headers: {
                        "x-access-permission": ACCESS_PERMISSION.MANAGE_EMAIL
                    }
                })

                if (res.data.success) {
                    const notiIds: number[] = res.data.notificationIds;

                    await prisma.announcements.create({
                        data: {
                            title: subject,
                            brief,
                            is_link,
                            where_to_look,
                            link_name,
                            userId: person.id
                        }
                    })

                    await prisma.notification.updateMany({
                        where: {
                            id: {
                                in: notiIds
                            }
                        },
                        data: {
                            is_handled: true
                        }
                    });
                }
            }
        }

        return res.status(200).json({ success: true, data: emailsToSend });
    } catch (error) {
        console.error("Scheduler Final Error:", error);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
}
