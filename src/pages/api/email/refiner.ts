import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import axios from "axios";
import { baseUrl } from "@/pages/_app";
import { USER_ROLE } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {

        const factoryResponse = await axios.post(`${baseUrl}/api/email/factory`);
        const factoryData = factoryResponse.data?.data || [];

        const emailsToSend = [];

        for (const entry of factoryData) {
            const { subject, body, type, notificationIds, shortlistId, brief, where_to_look, is_link, link_name } = entry;

            const props = await prisma.notification_properties.findUnique({
                where: { type }
            });

            if (!props || !props.send_email) continue;

            let to: string[] = ["placement_systems@iiml.ac.in"];
            let cc: string[] = []; // 
            let bcc: {
                pcomid: string,
                name: string,
                emailid: string
            }[] = []; // intended user 

            // fill bcc
            if (props.only_for_target) {
                if (type === "SHORTLIST") {
                    // Add all STUDENT users in bcc
                    const students = await prisma.shortlist.findUnique({
                        where: {
                            id: shortlistId as number,
                        }, select: {
                            shortlisted_users: {
                                where: {
                                    is_active: true,
                                    is_verified: true
                                },
                                select: {
                                    email_id: true,
                                    pcomid: true,
                                    name: true,
                                    id: true
                                }
                            }
                        }
                    })

                    bcc = students?.shortlisted_users.map((u) => {
                        return {
                            pcomid: u.pcomid || "0",
                            name: u.name,
                            emailid: u.email_id,
                            id: u.id
                        }
                    }) || [];

                } else {
                    const students = await prisma.user.findMany({
                        where: { role: USER_ROLE.STUDENT, is_active: true, is_verified: true },
                        select: { email_id: true, name: true, pcomid: true, id: true }
                    });
                    bcc = students.map(u => {
                        return {
                            pcomid: u.pcomid || "0",
                            name: u.name,
                            emailid: u.email_id,
                            id: u.id
                        }
                    });
                }
            } else if (props.role) {
                const users = await prisma.user.findMany({
                    where: { role: props.role, is_active: true, is_verified: true },
                    select: { email_id: true, name: true, pcomid: true, id: true }
                });
                bcc = users.map(u => {
                    return {
                        pcomid: u.pcomid || "0",
                        name: u.name,
                        emailid: u.email_id,
                        id: u.id
                    }
                });
            }

            emailsToSend.push({
                to,
                cc,
                bcc,
                subject,
                body,
                delay: props.delay,
                type,
                brief,
                where_to_look,
                is_link,
                link_name,
                notificationIds
            });
        }

        return res.status(200).json({ success: true, data: emailsToSend });
    } catch (error) {
        console.error("Scheduler Error:", error);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
}
