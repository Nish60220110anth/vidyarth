import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import {
    renderBodyTemplate,
    renderBriefTemplate,
    renderSubjectTemplate,
    renderTemplate,
} from "@/utils/emailTemplate";
import { toTitleCase } from "@/components/Profile";
import { chitraguptaShortlistUri, chitraguptaUrl } from "@/lib/config";
import { NOTIFICATION_TYPE, USER_ROLE } from "@prisma/client";

const ccBccEmails = (type: NOTIFICATION_TYPE, only_for_target: boolean) => {
    switch (type) {
        case NOTIFICATION_TYPE.SHORTLIST:
            return only_for_target ? {
                cc: ["pgp40432@iiml.ac.in"],
                bcc: ["placement_systems@iiml.ac.in"]
            } : {
                cc: ["pgp40432@iiml.ac.in"],
                bcc: ["placement_systems@iiml.ac.in"]
            }
        case NOTIFICATION_TYPE.COMPANY:
            return only_for_target ? {
                cc: ["pgp40432@iiml.ac.in"],
                bcc: ["placement_systems@iiml.ac.in"]
            } : {
                cc: ["pgp40432@iiml.ac.in"],
                bcc: ["placement_systems@iiml.ac.in"]
            }
        case NOTIFICATION_TYPE.COMPANY_CONTENT:
            return only_for_target ? {
                cc: ["pgp40432@iiml.ac.in"],
                bcc: ["placement_systems@iiml.ac.in"]
            } : {
                cc: ["pgp40432@iiml.ac.in"],
                bcc: ["placement_systems@iiml.ac.in"]
            }
        case NOTIFICATION_TYPE.ROUND_PREP:
            return only_for_target ? {
                cc: ["pgp40432@iiml.ac.in"],
                bcc: ["placement_systems@iiml.ac.in"]
            } : {
                cc: ["pgp40432@iiml.ac.in"],
                bcc: ["placement_systems@iiml.ac.in"]
            }
        case NOTIFICATION_TYPE.DOMAIN_PREP:
            return only_for_target ? {
                cc: ["pgp40432@iiml.ac.in"],
                bcc: ["placement_systems@iiml.ac.in"]
            } : {
                cc: ["pgp40432@iiml.ac.in"],
                bcc: ["placement_systems@iiml.ac.in"]
            }
        case NOTIFICATION_TYPE.CUSTOM:
            return {
                cc: [],
                bcc: []
            }
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const allStudents = await prisma.user.findMany({
            where: {
                role: USER_ROLE.STUDENT,
                is_active: true,
                is_verified: true
            },
            select: { id: true }
        });

        const allDisha = await prisma.user.findMany({
            where: {
                role: USER_ROLE.DISHA,
                is_active: true,
                is_verified: true
            },
            select: { id: true }
        });

        const emailContentBlocks: {
            type: NOTIFICATION_TYPE;
            email_content: {
                title: string;
                content: string;
                brief: string;
                cc?: string[];
                bcc?: string[];
            };
            recipient_user_ids: {
                userId: number;
                delay_minutes: number;
            }[];
            announcement: {
                title: string;
                brief: string;
                where_to_look: string;
                link_name: string;
                is_link: boolean;
            };
        }[] = [];

        // === SHORTLIST LOGIC ===

        const shortlistProps = await prisma.notification_properties.findUniqueOrThrow({
            where: { type: NOTIFICATION_TYPE.SHORTLIST }
        });

        const sendEmailShortlist = shortlistProps.send_email;

        if (sendEmailShortlist) {
            const shortlistNotifications = await prisma.notification.findMany({
                where: { is_handled: false, type: NOTIFICATION_TYPE.SHORTLIST },
                include: { shortlist: true, company: true, links: true },
            });


            const shortlistGrouped: Record<number, typeof shortlistNotifications> = {};
            for (const noti of shortlistNotifications) {
                if (!noti.shortlistId) continue;
                if (!shortlistGrouped[noti.shortlistId]) shortlistGrouped[noti.shortlistId] = [];
                shortlistGrouped[noti.shortlistId].push(noti);
            }

            for (const [shortlistIdStr, notifications] of Object.entries(shortlistGrouped)) {
                const shortlistId = parseInt(shortlistIdStr);
                const latest = notifications.reduce((a, b) =>
                    new Date(a.updated_at) > new Date(b.updated_at) ? a : b
                );

                const scompany = await prisma.company.findUnique({
                    where: { id: latest.shortlist?.company_id },
                });

                const companyObj = latest.links.find(l => l.link_name === "company_link");
                const mySectionObj = latest.links.find(l => l.link_name === "my_section_link");

                const subject = renderSubjectTemplate(NOTIFICATION_TYPE.SHORTLIST, {
                    company_full: scompany?.company_full || "",
                    role: latest.shortlist?.role || "",
                });

                const body = renderBodyTemplate(NOTIFICATION_TYPE.SHORTLIST, {
                    company_full: scompany?.company_full || "",
                    role: latest.shortlist?.role || "",
                    pcom_id: "{{pcom_id}}",
                    name: "{{name}}"
                }, [
                    { name: "Chitragupta Shortlist", url: `${chitraguptaUrl}${chitraguptaShortlistUri}` },
                    { name: toTitleCase((companyObj?.link_name || "").replaceAll("_", " ")), url: companyObj?.link || "" },
                    { name: toTitleCase((mySectionObj?.link_name || "").replaceAll("_", " ")), url: mySectionObj?.link || "" },
                ]);

                const brief = renderBriefTemplate(NOTIFICATION_TYPE.SHORTLIST, {
                    company_full: scompany?.company_full || "",
                    role: latest.shortlist?.role || "",
                });

                let recipient_user_ids = [];
                if (shortlistProps.only_for_target) {
                    const shortlistUsers = await prisma.shortlist.findMany({
                        where: { id: shortlistId },
                        select: { shortlisted_users: { select: { id: true } } },
                    });
                    recipient_user_ids = shortlistUsers.flatMap(u =>
                        u.shortlisted_users.map(s => ({
                            userId: s.id,
                            delay_minutes: shortlistProps.delay_minutes || 15,
                        }))
                    );
                } else {
                    recipient_user_ids = (await prisma.user.findMany({
                        where: {
                            role: shortlistProps.role || USER_ROLE.ADMIN,
                            is_active: true,
                            is_verified: true,
                        },
                        select: { id: true },
                    })).map(u => ({
                        userId: u.id,
                        delay_minutes: shortlistProps.delay_minutes || 15,
                    }));
                }

                emailContentBlocks.push({
                    type: NOTIFICATION_TYPE.SHORTLIST,
                    email_content: {
                        title: subject,
                        content: body,
                        brief,
                        cc: ccBccEmails(NOTIFICATION_TYPE.SHORTLIST, shortlistProps.only_for_target).cc,
                        bcc: ccBccEmails(NOTIFICATION_TYPE.SHORTLIST, shortlistProps.only_for_target).bcc,
                    },
                    recipient_user_ids,
                    announcement: {
                        title: subject,
                        brief,
                        where_to_look: `${chitraguptaUrl}${chitraguptaShortlistUri}`,
                        link_name: "Chitragupta Shortlist",
                        is_link: true,
                    }
                });
            }
        }

        // === COMPANY LOGIC ===
        const companyProps = await prisma.notification_properties.findUniqueOrThrow({
            where: { type: NOTIFICATION_TYPE.COMPANY },
        });

        const sendEmailCompany = companyProps.send_email;

        if (sendEmailCompany) {

            const companyNotifications = await prisma.notification.findMany({
                where: { is_handled: false, type: NOTIFICATION_TYPE.COMPANY },
                include: { company: true, links: true },
            });
            const companyGrouped: Record<number, typeof companyNotifications> = {};
            for (const noti of companyNotifications) {
                if (!noti.companyId) continue;
                if (!companyGrouped[noti.companyId]) companyGrouped[noti.companyId] = [];
                companyGrouped[noti.companyId].push(noti);
            }

            for (const [companyIdStr, notifications] of Object.entries(companyGrouped)) {
                const latest = notifications.reduce((a, b) =>
                    new Date(a.updated_at) > new Date(b.updated_at) ? a : b
                );

                const companyObj = latest.links.find(l => l.link_name === "company_link");

                const subject = renderSubjectTemplate(NOTIFICATION_TYPE.COMPANY, {
                    company_full: latest.company?.company_full || "",
                });

                const body = renderBodyTemplate(NOTIFICATION_TYPE.COMPANY, {
                    company_full: latest.company?.company_full || "",
                    pcom_id: "{{pcom_id}}",
                    name: "{{name}}"
                }, [
                    { name: toTitleCase((companyObj?.link_name || "").replaceAll("_", " ")), url: companyObj?.link || "" }
                ]);

                const brief = renderBriefTemplate(NOTIFICATION_TYPE.COMPANY, {
                    company_full: latest.company?.company_full || "",
                });

                let recipient_user_ids = [];
                if (companyProps.only_for_target) {
                    const users = [...allStudents, ...allDisha];
                    recipient_user_ids = users.map(u => ({
                        userId: u.id,
                        delay_minutes: companyProps.delay_minutes || 15,
                    }));
                } else {
                    recipient_user_ids = (await prisma.user.findMany({
                        where: {
                            role: companyProps.role || USER_ROLE.ADMIN,
                            is_active: true,
                            is_verified: true,
                        },
                        select: { id: true },
                    })).map(u => ({
                        userId: u.id,
                        delay_minutes: companyProps.delay_minutes || 15,
                    }));
                }

                emailContentBlocks.push({
                    type: NOTIFICATION_TYPE.COMPANY,
                    email_content: {
                        title: subject,
                        content: body,
                        brief,
                        cc: ccBccEmails(NOTIFICATION_TYPE.COMPANY, companyProps.only_for_target).cc,
                        bcc: ccBccEmails(NOTIFICATION_TYPE.COMPANY, companyProps.only_for_target).bcc,
                    },
                    recipient_user_ids,
                    announcement: {
                        title: subject,
                        brief,
                        where_to_look: companyObj?.link || "",
                        link_name: toTitleCase((companyObj?.link_name || "").replaceAll("_", " ")),
                        is_link: true,
                    }
                });
            }
        }

        // === DOMAIN_PREP LOGIC ===
        const domainPrepProps = await prisma.notification_properties.findUniqueOrThrow({
            where: { type: NOTIFICATION_TYPE.DOMAIN_PREP },
        });

        const sendEmailDomainPrep = domainPrepProps.send_email;

        if (sendEmailDomainPrep) {
            const domainPrepNotifications = await prisma.notification.findMany({
                where: {
                    type: NOTIFICATION_TYPE.DOMAIN_PREP,
                    is_handled: false,
                },
                include: { links: true },
            });

            const latestPerDomain: Record<string, typeof domainPrepNotifications[number]> = {};

            for (const noti of domainPrepNotifications) {
                if (!noti.domain) continue;
                const existing = latestPerDomain[noti.domain];
                if (!existing || new Date(noti.updated_at) > new Date(existing.updated_at)) {
                    latestPerDomain[noti.domain] = noti;
                }
            }

            const domainNames = Object.keys(latestPerDomain).map(d => toTitleCase(d));
            const domainStr = domainNames.join(", ");

            const latestUpdated = Object.values(latestPerDomain).reduce((a, b) =>
                new Date(a.updated_at) > new Date(b.updated_at) ? a : b
            );
            const updatedAt = latestUpdated.updated_at;
            const dateStr = updatedAt.toLocaleDateString();
            const timeStr = updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });

            // Collate links from all latest domain notis
            let dynamic_links = "";
            const link_template = `<li><a href="{{domain_link}}" style="color: #007bff; text-decoration: none;">{{domain_link_name}}</a></li>`;

            for (const noti of Object.values(latestPerDomain)) {
                for (const link of noti.links) {
                    dynamic_links += renderTemplate(link_template, {
                        domain_link_name: toTitleCase(noti.domain || ""),
                        domain_link: link.link,
                    });
                }
            }

            const subject = renderSubjectTemplate(NOTIFICATION_TYPE.DOMAIN_PREP, {
                domain: domainStr
            });

            const brief = renderBriefTemplate(NOTIFICATION_TYPE.DOMAIN_PREP, {
                domain: domainStr
            });

            const domainLinks = Object.values(latestPerDomain).flatMap(noti =>
                noti.links.map(link => ({
                    name: toTitleCase(noti.domain || ""),
                    url: link.link
                }))
            );

            const body = renderBodyTemplate(NOTIFICATION_TYPE.DOMAIN_PREP, {
                domain: domainStr,
                updated_at: `${dateStr} ${timeStr}`,
                pcom_id: "{{pcom_id}}",
                name: "{{name}}"
            }, domainLinks);


            const targetRole = domainPrepProps.role || USER_ROLE.ADMIN;
            const recipient_user_ids = (await prisma.user.findMany({
                where: {
                    role: targetRole,
                    is_active: true,
                    is_verified: true,
                },
                select: { id: true },
            })).map(u => ({
                userId: u.id,
                delay_minutes: domainPrepProps.delay_minutes || 15,
            }));

            emailContentBlocks.push({
                type: NOTIFICATION_TYPE.DOMAIN_PREP,
                email_content: {
                    title: subject,
                    content: body,
                    brief,
                    cc: ccBccEmails(NOTIFICATION_TYPE.DOMAIN_PREP, domainPrepProps.only_for_target).cc,
                    bcc: ccBccEmails(NOTIFICATION_TYPE.DOMAIN_PREP, domainPrepProps.only_for_target).bcc,
                },
                recipient_user_ids,
                announcement: {
                    title: subject,
                    brief,
                    where_to_look: "", // not a single source
                    link_name: "",     // not applicable here
                    is_link: false,
                }
            });
        }

        // === ROUND_PREP LOGIC ===
        const roundPrepProps = await prisma.notification_properties.findUniqueOrThrow({
            where: { type: NOTIFICATION_TYPE.ROUND_PREP },
        });

        const sendEmailRoundPrep = roundPrepProps.send_email;

        if (sendEmailRoundPrep) {
            const roundPrepNotis = await prisma.notification.findMany({
                where: {
                    type: NOTIFICATION_TYPE.ROUND_PREP,
                    is_handled: false,
                },
                include: { links: true },
            });

            if (roundPrepNotis.length > 0) {
                const latest = roundPrepNotis.reduce((a, b) =>
                    new Date(a.updated_at) > new Date(b.updated_at) ? a : b
                );

                const updatedAt = latest.updated_at;
                const dateStr = updatedAt.toLocaleDateString();
                const timeStr = updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

                const link = latest.links.find(l => l.link_name === "round_prep_link");
                const roundPrepLink = link?.link || "";
                const roundPrepLinkName = toTitleCase((link?.link_name || "").replaceAll("_", " "));

                const subject = renderSubjectTemplate(NOTIFICATION_TYPE.ROUND_PREP, {});

                const body = renderBodyTemplate(NOTIFICATION_TYPE.ROUND_PREP, {
                    updated_at: `${dateStr} ${timeStr}`,
                    pcom_id: "{{pcom_id}}",
                    name: "{{name}}"
                }, [
                    { name: toTitleCase((link?.link_name || "").replaceAll("_", " ")), url: link?.link || "" }
                ]);

                const brief = renderBriefTemplate(NOTIFICATION_TYPE.ROUND_PREP, {});

                const targetRole = roundPrepProps.role || USER_ROLE.ADMIN;
                const recipient_user_ids = (await prisma.user.findMany({
                    where: {
                        role: targetRole,
                        is_active: true,
                        is_verified: true,
                    },
                    select: { id: true },
                })).map(u => ({
                    userId: u.id,
                    delay_minutes: roundPrepProps.delay_minutes || 15,
                }));

                emailContentBlocks.push({
                    type: NOTIFICATION_TYPE.ROUND_PREP,
                    email_content: {
                        title: subject,
                        content: body,
                        brief,
                        cc: ccBccEmails(NOTIFICATION_TYPE.ROUND_PREP, roundPrepProps.only_for_target).cc,
                        bcc: ccBccEmails(NOTIFICATION_TYPE.ROUND_PREP, roundPrepProps.only_for_target).bcc,
                    },
                    recipient_user_ids,
                    announcement: {
                        title: subject,
                        brief,
                        where_to_look: roundPrepLink,
                        link_name: roundPrepLinkName,
                        is_link: true,
                    }
                });
            }
        }

        // === COMPANY_CONTENT LOGIC ===
        const companyContentProps = await prisma.notification_properties.findUniqueOrThrow({
            where: { type: NOTIFICATION_TYPE.COMPANY_CONTENT },
        });

        const sendEmailCompanyContent = companyContentProps.send_email;

        if (sendEmailCompanyContent) {
            const companyContentNotis = await prisma.notification.findMany({
                where: {
                    type: NOTIFICATION_TYPE.COMPANY_CONTENT,
                    is_handled: false,
                },
                include: {
                    company: true,
                    links: true,
                },
            });

            const latestPerCompanySubtype: Record<string, typeof companyContentNotis[number]> = {};

            for (const noti of companyContentNotis) {
                if (!noti.companyId || !noti.subtype) continue;
                const key = `${noti.companyId}_${noti.subtype}`;
                const existing = latestPerCompanySubtype[key];
                if (!existing || new Date(noti.updated_at) > new Date(existing.updated_at)) {
                    latestPerCompanySubtype[key] = noti;
                }
            }

            const groupedByCompany: Record<number, typeof companyContentNotis[number][]> = {};
            for (const noti of Object.values(latestPerCompanySubtype)) {
                if (!noti.companyId) continue;
                if (!groupedByCompany[noti.companyId]) groupedByCompany[noti.companyId] = [];
                groupedByCompany[noti.companyId].push(noti);
            }

            for (const [companyIdStr, notifications] of Object.entries(groupedByCompany)) {
                const companyId = parseInt(companyIdStr);
                const company = notifications[0]?.company;
                if (!company) continue;

                const latest = notifications.reduce((a, b) =>
                    new Date(a.updated_at) > new Date(b.updated_at) ? a : b
                );

                const updatedAt = latest.updated_at;
                const dateStr = updatedAt.toLocaleDateString();
                const timeStr = updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

                // Build dynamic links
                let dynamic_links = "";
                const link_template = `<li><a href="{{pane_link}}" style="color: #007bff; text-decoration: none;">{{pane_link_name}}</a></li>`;

                for (const noti of notifications) {
                    for (const link of noti.links) {
                        dynamic_links += renderTemplate(link_template, {
                            pane_link_name: toTitleCase(link.link_name.replaceAll("_", " ")),
                            pane_link: link.link,
                        });
                    }
                }

                const subject = renderSubjectTemplate(NOTIFICATION_TYPE.COMPANY_CONTENT, {
                    company_full: company.company_full,
                });

                const brief = renderBriefTemplate(NOTIFICATION_TYPE.COMPANY_CONTENT, {
                    company_full: company.company_full,
                });

                const linksList = notifications.flatMap(noti =>
                    noti.links.map(link => ({
                        name: toTitleCase(link.link_name.replaceAll("_", " ")),
                        url: link.link
                    }))
                );

                const body = renderBodyTemplate(NOTIFICATION_TYPE.COMPANY_CONTENT, {
                    company_full: company.company_full,
                    updated_at: `${dateStr} ${timeStr}`,
                    pcom_id: "{{pcom_id}}",
                    name: "{{name}}"
                }, linksList);


                const targetRole = companyContentProps.role || USER_ROLE.ADMIN;
                const recipient_user_ids = (await prisma.user.findMany({
                    where: {
                        role: targetRole,
                        is_active: true,
                        is_verified: true,
                    },
                    select: { id: true },
                })).map(u => ({
                    userId: u.id,
                    delay_minutes: companyContentProps.delay_minutes || 15,
                }));

                emailContentBlocks.push({
                    type: NOTIFICATION_TYPE.COMPANY_CONTENT,
                    email_content: {
                        title: subject,
                        content: body,
                        brief,
                        cc: ccBccEmails(NOTIFICATION_TYPE.COMPANY_CONTENT, companyContentProps.only_for_target).cc,
                        bcc: ccBccEmails(NOTIFICATION_TYPE.COMPANY_CONTENT, companyContentProps.only_for_target).bcc,
                    },
                    recipient_user_ids,
                    announcement: {
                        title: subject,
                        brief,
                        where_to_look: "", // Not a single location
                        link_name: "",
                        is_link: false,
                    }
                });
            }
        }

        const allNotificationProps = await prisma.notification_properties.findMany();
        const propsByType = Object.fromEntries(
            allNotificationProps.map((p) => [p.type, p])
        );

        // === Finalize DB Inserts ===

        const insertedContents = [];

        for (const block of emailContentBlocks) {
            const { email_content, recipient_user_ids, announcement, type } = block;

            const onlyForTarget = propsByType[type]?.only_for_target ?? true;
            const ccEmails = ccBccEmails(type, onlyForTarget).cc;
            const bccEmails = ccBccEmails(type, onlyForTarget).bcc;

            const ccUsers = await prisma.user.findMany({
                where: { email_id: { in: ccEmails } },
                select: { id: true },
            });

            const bccUsers = await prisma.user.findMany({
                where: { email_id: { in: bccEmails } },
                select: { id: true },
            });

            const emailContent = await prisma.email_content.create({
                data: {
                    title: email_content.title,
                    content: email_content.content,
                    brief: email_content.brief,
                    cc: {
                        connect: ccUsers.map(u => ({ id: u.id })),
                    },
                    bcc: {
                        connect: bccUsers.map(u => ({ id: u.id })),
                    },
                },
            });

            await prisma.email_recipient_state.createMany({
                data: recipient_user_ids.map(r => ({
                    userId: r.userId,
                    email_contentId: emailContent.id,
                    delay_minutes: r.delay_minutes,
                })),
                skipDuplicates: true,
            });

            const announ = await prisma.announcements.create({
                data: {
                    title: announcement.title,
                    brief: announcement.brief,
                    where_to_look: announcement.where_to_look,
                    link_name: announcement.link_name,
                    is_link: announcement.is_link,
                },
            });

            const recipientIds = recipient_user_ids.map(r => r.userId);
            await prisma.announcements.update({
                where: { id: announ.id },
                data: {
                    user: {
                        connect: recipientIds.map(id => ({ id })),
                    },
                },
            });

            insertedContents.push({
                email_content_id: emailContent.id,
                title: email_content.title,
                recipients: recipient_user_ids.length,
                announcement,
            });
        }

        return res.status(200).json({
            success: true,
            inserted: insertedContents,
        });


    } catch (err) {
        console.error("Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}