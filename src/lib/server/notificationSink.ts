import { DOMAIN, NOTIFICATION_SOURCE_INITIATOR, NOTIFICATION_SUBTYPE, NOTIFICATION_TYPE, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import z from "zod";

export type CreateNotificationDTO = {
    type: NOTIFICATION_TYPE;
    subtype?: NOTIFICATION_SUBTYPE | null | undefined;
    initiator: NOTIFICATION_SOURCE_INITIATOR;
    shortlistId?: number | null | undefined;
    companyId?: number | null | undefined;
    domain?: DOMAIN | null | undefined;
    links: { link: string; link_name: string }[];
};

const NotificationSchema = z.object({
    type: z.enum(NOTIFICATION_TYPE),
    subtype: z.enum(NOTIFICATION_SUBTYPE).nullable().optional(),
    initiator: z.enum(NOTIFICATION_SOURCE_INITIATOR),
    shortlistId: z.number().min(1).nullable().optional(),
    companyId: z.number().min(1).nullable().optional(),
    domain: z.enum(DOMAIN).nullable().optional(),
    links: z.array(z.object({
        link: z.url(),
        link_name: z.string().max(255),
    })),
});

export async function createNotification(input: CreateNotificationDTO) {
    const parsed = NotificationSchema.safeParse(input);

    if (!parsed.success) {
        console.error("Invalid notification data:", parsed.error);
        throw new Error(`Invalid notification data: ${parsed.error.message}`);
    }

    if (parsed.data.type === NOTIFICATION_TYPE.COMPANY_CONTENT && parsed.data.initiator === NOTIFICATION_SOURCE_INITIATOR.UPDATED && parsed.data.companyId) {
        await prisma.summary.updateMany({
            where: {
                companyId: parsed.data.companyId,
            },
            data: {
                is_changed: true,
            },
        });
    }

    return prisma.notification.create({
        data: {
            type: parsed.data.type,
            subtype: parsed.data.subtype,
            initiator: parsed.data.initiator,
            is_handled: false,
            domain: parsed.data.domain ?? null,
            ...(parsed.data.shortlistId != null && { shortlist: { connect: { id: parsed.data.shortlistId } } }),
            ...(parsed.data.companyId != null && { company: { connect: { id: parsed.data.companyId } } }),
            links: { create: parsed.data.links },
        },
        include: { links: true },
    });
}
