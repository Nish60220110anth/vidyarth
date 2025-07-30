import { prisma } from '@/lib/prisma';

async function getCompanies (company_id?: number, initialFilter: any = {}) {
    const whereClause = { ...initialFilter };

    if (company_id && !isNaN(company_id)) {
        whereClause.id = company_id;
    }

    return prisma.company.findMany({
        where: whereClause,
        include: {
            domains: {
                select: { domain: true },
            },
        },
        orderBy: [
            { company_full: "asc" },
            { company_name: "asc" },
            { created_at: "desc" },
        ],
    });
}

async function UpdateCompanyById(id: number, data: any) {
    return prisma.company.update({
        where: { id },
        data,
    });
}

export {
    getCompanies,
    UpdateCompanyById
};