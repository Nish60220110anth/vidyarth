import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { renderBodyTemplate, renderBriefTemplate, renderSubjectTemplate, renderTemplate } from '@/utils/emailTemplate';
import { NOTIFICATION_TYPE } from '@prisma/client';
import { toTitleCase } from '@/components/Profile';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const unhandled = await prisma.notification.findMany({
            where: { is_handled: false },
            include: {
                shortlist: true,
                company: true,
                links: {
                    select: {
                        link_name: true,
                        link: true,
                        notification: true
                    }
                }
            },
        });

        const emailQueue: {
            subject: string;
            body: string;
            notificationIds: number[];
            type: NOTIFICATION_TYPE;
            shortlistId?: number,
            brief: string,
            where_to_look: string,
            is_link: boolean,
            link_name: string
        }[] = [];

        const contentGrouped: Record<number, {
            latestPerLinkName: Record<string, typeof unhandled[number]>,
            allIds: Set<number>
        }> = {};


        for (const n of unhandled) {
            if (!n.company && !n.domain && !n.shortlistId) continue;

            if (n.type === 'SHORTLIST') {
                if (!n.shortlistId) continue;

                const scompany = await prisma.company.findUnique({
                    where: {
                        id: n.shortlist?.company_id
                    }
                })

                const subject = renderSubjectTemplate('SHORTLIST', {
                    company_full: scompany?.company_full || "",
                    role: n.shortlist?.role || ""
                });

                const chitraguptaLinkObj = n.links.find(link => 'chitragupta_link' === link.link_name);
                const companyObj = n.links.find(link => 'company_link' === link.link_name);
                const mySectionObj = n.links.find(link => 'my_section_link' === link.link_name);

                const body = renderBodyTemplate('SHORTLIST', {
                    company_full: scompany?.company_full || "",
                    role: n.shortlist?.role || "",
                    chitragupta_link: chitraguptaLinkObj?.link || "",
                    chitragupta_link_name: toTitleCase((chitraguptaLinkObj?.link_name || "").replaceAll("_", " ")),
                    company_link: companyObj?.link || "",
                    company_link_name: toTitleCase((companyObj?.link_name || "").replaceAll("_", " ")),
                    my_section_link: mySectionObj?.link || "",
                    my_section_link_name: toTitleCase((mySectionObj?.link_name || "").replaceAll("_", " "))
                });

                const brief = renderBriefTemplate('SHORTLIST', {
                    company_full: scompany?.company_full || "",
                    role: n.shortlist?.role || "",
                })

                const where_to_look = chitraguptaLinkObj?.link || "";
                const link_name = toTitleCase((chitraguptaLinkObj?.link_name || "").replaceAll("_", " "));
                const is_link = true;

                emailQueue.push({
                    subject,
                    body,
                    notificationIds: [n.id],
                    type: 'SHORTLIST',
                    shortlistId: n.shortlistId || 0,
                    brief,
                    is_link,
                    link_name,
                    where_to_look
                });

            } else if (n.type === 'COMPANY') {
                if (!n.company) continue;
                const subject = renderSubjectTemplate('COMPANY', {
                    company_full: n.company.company_full,
                });

                const companyObj = n.links.find(link => 'company_link' === link.link_name);

                const body = renderBodyTemplate('COMPANY', {
                    company_full: n.company.company_full,
                    company_link: companyObj?.link || "",
                    company_link_name: toTitleCase((companyObj?.link_name || "").replaceAll("_", " ")),
                });

                const brief = renderBriefTemplate('COMPANY', {
                    company_full: n.company.company_full,
                })

                const where_to_look = companyObj?.link || "";
                const link_name = toTitleCase((companyObj?.link_name || "").replaceAll("_", " "));
                const is_link = true;

                emailQueue.push({
                    subject,
                    body,
                    notificationIds: [n.id],
                    type: 'COMPANY',
                    brief,
                    is_link,
                    link_name,
                    where_to_look
                });

            } else if (n.type === 'CONTENT') {
                if (!n.company) continue;
                const cid = n.companyId!;

                if (!contentGrouped[cid]) {
                    contentGrouped[cid] = {
                        latestPerLinkName: {},
                        allIds: new Set<number>()
                    };
                }

                contentGrouped[cid].allIds.add(n.id);

                for (const link of n.links) {
                    const linkKey = link.link_name;
                    const existing = contentGrouped[cid].latestPerLinkName[linkKey];

                    if (
                        !existing ||
                        new Date(n.updated_at).getTime() > new Date(existing.updated_at).getTime()
                    ) {
                        contentGrouped[cid].latestPerLinkName[linkKey] = n;
                    }
                }

            } else if (n.type === 'PREP') {
                if (!n.domain) continue;
                const subject = renderSubjectTemplate('PREP', {
                    domain: toTitleCase(n.domain)
                });

                const domainObj = n.links.find(link => 'domain_link' === link.link_name);

                const updatedAt = n.updated_at;
                const dateStr = updatedAt.toLocaleDateString();
                const timeStr = updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

                const body = renderBodyTemplate('PREP', {
                    domain: toTitleCase(n.domain),
                    domain_link: domainObj?.link || "",
                    domain_link_name: toTitleCase((domainObj?.link_name || "").replaceAll("_", " ")),
                    updated_at: `${dateStr} ${timeStr}`
                });

                const brief = renderBriefTemplate('PREP', {
                    domain: toTitleCase(n.domain)
                })

                const where_to_look = domainObj?.link || "";
                const link_name = toTitleCase((domainObj?.link_name || "").replaceAll("_", " "));
                const is_link = true;

                emailQueue.push({
                    subject,
                    body,
                    notificationIds: [n.id],
                    type: 'PREP',
                    brief,
                    is_link,
                    link_name,
                    where_to_look
                });
            }
        }

        // Collated content emails
        for (const [_companyId, { latestPerLinkName, allIds }] of Object.entries(contentGrouped)) {
            const companyId = parseInt(_companyId);
            const notificationsUsed = Object.values(latestPerLinkName);
            const latest = notificationsUsed.reduce((a, b) =>
                new Date(a.updated_at) > new Date(b.updated_at) ? a : b
            );

            const company = latest.company!;
            const subject = renderSubjectTemplate('CONTENT', {
                company_full: company.company_full,
            });

            const updatedAt = latest.updated_at;
            const dateStr = updatedAt.toLocaleDateString();
            const timeStr = updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

            let dynamic_links = "";
            const link_template = `
      <li><a href="{{domain_link}}" style="color: #007bff; text-decoration: none;">{{domain_link_name}}</a></li>
    `;

            for (const [linkName, noti] of Object.entries(latestPerLinkName)) {
                for (const link of noti.links.filter(l => l.link_name === linkName)) {
                    dynamic_links += renderTemplate(link_template, {
                        domain_link_name: toTitleCase(link.link_name.replaceAll("_", " ")),
                        domain_link: link.link
                    });
                }
            }

            const body = renderBodyTemplate('CONTENT', {
                company_full: company.company_full,
                dynamic_links,
                updated_at: `${dateStr} ${timeStr}`
            });

            const brief = renderBriefTemplate('CONTENT', {
                company_full: company.company_full
            })

            const where_to_look =  "";
            const link_name = "";
            const is_link = false;

            emailQueue.push({
                subject,
                body,
                notificationIds: Array.from(allIds),
                type: 'CONTENT',
                brief,
                is_link,
                link_name,
                where_to_look
            });
        }

        return res.status(200).json({ success: true, data: emailQueue });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
}
