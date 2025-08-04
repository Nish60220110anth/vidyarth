import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
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
        case NOTIFICATION_TYPE.CV_PREP:
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
                    chitragupta_link: `${chitraguptaUrl}${chitraguptaShortlistUri}`,
                    chitragupta_link_name: "Chitragupta Shortlist",
                    company_link: companyObj?.link || "",
                    company_link_name: toTitleCase((companyObj?.link_name || "").replaceAll("_", " ")),
                    my_section_link: mySectionObj?.link || "",
                    my_section_link_name: toTitleCase((mySectionObj?.link_name || "").replaceAll("_", " ")),
                });

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
                    company_link: companyObj?.link || "",
                    company_link_name: toTitleCase((companyObj?.link_name || "").replaceAll("_", " ")),
                });

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
                        domain_link_name: toTitleCase(link.link_name.replaceAll("_", " ")),
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

            const body = renderBodyTemplate(NOTIFICATION_TYPE.DOMAIN_PREP, {
                domain: domainStr,
                domain_link: dynamic_links,
                domain_link_name: "", 
                updated_at: `${dateStr} ${timeStr}`
            });

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

        // === CV_PREP LOGIC ===
        const cvPrepProps = await prisma.notification_properties.findUniqueOrThrow({
            where: { type: NOTIFICATION_TYPE.CV_PREP },
        });

        const sendEmailCVPrep = cvPrepProps.send_email;

        if (sendEmailCVPrep) {
            const cvPrepNotis = await prisma.notification.findMany({
                where: {
                    type: NOTIFICATION_TYPE.CV_PREP,
                    is_handled: false,
                },
                include: { links: true },
            });

            if (cvPrepNotis.length > 0) {
                const latest = cvPrepNotis.reduce((a, b) =>
                    new Date(a.updated_at) > new Date(b.updated_at) ? a : b
                );

                const updatedAt = latest.updated_at;
                const dateStr = updatedAt.toLocaleDateString();
                const timeStr = updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

                const link = latest.links.find(l => l.link_name === "cv_prep_link");
                const cvPrepLink = link?.link || "";
                const cvPrepLinkName = toTitleCase((link?.link_name || "").replaceAll("_", " "));

                const subject = renderSubjectTemplate(NOTIFICATION_TYPE.CV_PREP, {});
                const body = renderBodyTemplate(NOTIFICATION_TYPE.CV_PREP, {
                    cv_prep_link: cvPrepLink,
                    cv_prep_link_name: cvPrepLinkName,
                    updated_at: `${dateStr} ${timeStr}`,
                });
                const brief = renderBriefTemplate(NOTIFICATION_TYPE.CV_PREP, {});

                const targetRole = cvPrepProps.role || USER_ROLE.ADMIN;
                const recipient_user_ids = (await prisma.user.findMany({
                    where: {
                        role: targetRole,
                        is_active: true,
                        is_verified: true,
                    },
                    select: { id: true },
                })).map(u => ({
                    userId: u.id,
                    delay_minutes: cvPrepProps.delay_minutes || 15,
                }));

                emailContentBlocks.push({
                    email_content: {
                        title: subject,
                        content: body,
                        brief,
                        cc: ccBccEmails(NOTIFICATION_TYPE.CV_PREP, cvPrepProps.only_for_target).cc,
                        bcc: ccBccEmails(NOTIFICATION_TYPE.CV_PREP, cvPrepProps.only_for_target).bcc,
                    },
                    recipient_user_ids,
                    announcement: {
                        title: subject,
                        brief,
                        where_to_look: cvPrepLink,
                        link_name: cvPrepLinkName,
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

                const body = renderBodyTemplate(NOTIFICATION_TYPE.COMPANY_CONTENT, {
                    company_full: company.company_full,
                    updated_at: `${dateStr} ${timeStr}`,
                    dynamic_links,
                });

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


        return res.status(200).json({
            success: true,
            data: emailContentBlocks,
        });

    } catch (err) {
        console.error("Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}