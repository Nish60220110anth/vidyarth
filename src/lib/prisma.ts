// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const getPrisma = () =>
    new PrismaClient();

declare global {
    var prisma: ReturnType<typeof getPrisma> | undefined;
}

export const prisma = global.prisma ?? getPrisma();

if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
}
