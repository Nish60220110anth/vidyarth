import { DOMAIN, NOTIFICATION_SUBTYPE, NOTIFICATION_TYPE } from "@prisma/client";
import { prisma } from "@/lib/prisma";

interface CreateNotificationArgs {
    type: NOTIFICATION_TYPE;
    subtype: NOTIFICATION_SUBTYPE;
    shortlistId?: number;
    companyId?: number;
    domain?: DOMAIN;
    links: { link: string; link_name: string }[];
}

export async function createNotification({
    type,
    subtype,
    shortlistId,
    companyId,
    domain,
    links
}: CreateNotificationArgs) {
    if (!type || !subtype) {
        throw new Error("Both 'type' and 'subtype' are required.");
    }

    if (!shortlistId && !companyId && !domain) {
        throw new Error("At least one of 'shortlistId', 'companyId' or 'domain' must be provided.");
    }

    switch (type) {
        case 'SHORTLIST':
            if (!['SL', 'ESL'].includes(subtype)) {
                throw new Error("SHORTLIST type requires subtype to be 'SL' or 'ESL'.");
            }
            break;

        case 'COMPANY':
            if (!subtype) {
                throw new Error("COMPANY type requires a valid subtype.");
            }
            break;

        case 'CONTENT':
            if (!['ADDED', 'UPDATED'].includes(subtype)) {
                throw new Error("CONTENT type requires subtype to be 'ADDED' or 'UPDATED'.");
            }
            break;

        case 'PREP':
            if (!['UPDATED'].includes(subtype)) {
                throw new Error("PREP type requires subtype to be 'UPDATED'.");
            }
            break;

        default:
            throw new Error("Unsupported notification type.");
    }

    return prisma.notification.create({
        data: {
            type,
            subtype,
            shortlistId: shortlistId ?? null,
            companyId: companyId ?? null,
            domain: domain ?? null,
            is_handled: false,
            links: {
                create: links.map(l => ({
                    link: l.link,
                    link_name: l.link_name,
                })),
            },
        },
    });
}
