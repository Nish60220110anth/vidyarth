import {prisma} from '../../prisma';

async function getUserByEmail(email_id?: string) {
    return prisma.user.findUniqueOrThrow({
        where: { email_id }
    });
}

async function getUserById(id: number) {
    return prisma.user.findUniqueOrThrow({
        where: { id }
    });
}

export {
    getUserByEmail,
    getUserById
}