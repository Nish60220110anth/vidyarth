import { ACCESS_PERMISSION, PrismaClient, USER_ROLE } from "@prisma/client";

const prisma = new PrismaClient();

export const getPermissions = async (role: USER_ROLE): Promise<ACCESS_PERMISSION[]> => {
    const permissions = await prisma.role_permission.findUnique({
        where: {
            role,
        },
        include: {
            permissions: {
                select: {
                    permission: true,
                },
            },
        },
    });

    return permissions?.permissions.map(p => p.permission) ?? [];
};
