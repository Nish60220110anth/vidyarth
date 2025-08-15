import { prisma } from "../../prisma";
import { DOMAIN } from "@prisma/client";

const DEFAULT_JD_DOMAIN = DOMAIN.GENMAN;

async function getJDByID(jdId: string) {
    const jd = await prisma.company_jd.findUniqueOrThrow({
        where: { id: jdId },
        include: {
            company: true,
            placement_cycle: true,
            domains: true,
        },
    });

    return {
        ...jd,
        domains: jd.domains.map(d => d.domain),
    };
}

async function createDefaultJD(cycleid: number) {
    const defaultJD = await prisma.company_jd.create({
        data: {
            company_id: 0,
            placement_cycle_id: cycleid,
            role: "default role",
            pdf_path: "",
            is_active: false,
        },
        include: {
            company: true,
            placement_cycle: true,
            domains: true,
        },
    });

    return defaultJD;
}

async function createDefaultJDDomain(jdid: string) {
    const defaultDomain = await prisma.companyjd_domain.create({
        data: {
            company_jd_id: jdid,
            domain: DEFAULT_JD_DOMAIN,
        },
    });

    return defaultDomain;
}

async function updateJD(
    jdId: string,
    data: {
        company_id: number;
        placement_cycle_id: number;
        role: string;
        is_active: boolean;
        keep_existing_pdf?: boolean;
        pdf_path?: string;
        pdf_name?: string;
        firebase_path?: string;
        domains: DOMAIN[];
    }
) {
    const {
        company_id,
        placement_cycle_id,
        role,
        is_active,
        keep_existing_pdf = false,
        pdf_path,
        pdf_name,
        firebase_path,
        domains,
    } = data;

    const updateData: any = {
        company_id,
        placement_cycle_id,
        role,
        is_active,
        ...(keep_existing_pdf
            ? {}
            : {
                pdf_path: pdf_path ?? null,
                pdf_name: pdf_name ?? null,
                firebase_path: firebase_path ?? null,
            }),
    };

    return prisma.$transaction(async (tx) => {
        await tx.company_jd.update({
            where: { id: jdId },
            data: updateData,
        });

        const current = await tx.companyjd_domain.findMany({
            where: { company_jd_id: jdId },
            select: { domain: true },
        });

        const currentSet = new Set(current.map((d) => d.domain));
        const nextSet = new Set(domains);

        const toRemove = [...currentSet].filter((d) => !nextSet.has(d));
        const toAdd = [...nextSet].filter((d) => !currentSet.has(d));

        if (toRemove.length) {
            await tx.companyjd_domain.deleteMany({
                where: { company_jd_id: jdId, domain: { in: toRemove } },
            });
        }

        if (toAdd.length) {
            await tx.companyjd_domain.createMany({
                data: toAdd.map((d) => ({ company_jd_id: jdId, domain: d })),
                skipDuplicates: true,
            });
        }

        return tx.company_jd.findUnique({
            where: { id: jdId },
            include: {
                company: true,
                placement_cycle: true,
                domains: true,
            },
        });
    });
}

async function deleteDomainsByJDId(jdId: string) {
    return prisma.companyjd_domain.deleteMany({
        where: { company_jd_id: jdId },
    });
}

async function deleteJD(jdId: string) {
    return prisma.company_jd.delete({
        where: { id: jdId },
    });
}

export {
    getJDByID,
    createDefaultJD,
    createDefaultJDDomain,
    updateJD,
    deleteDomainsByJDId,
    deleteJD
}