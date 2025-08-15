// lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

const env = process.env.NODE_ENV ?? 'development';
const envFile =
    env === 'production' ? '.env.production'
        : env === 'test' ? '.env.test'
            : '.env.development';

dotenv.config({ path: envFile });
dotenv.config();

if (!process.env.DATABASE_URL) {
    throw new Error(`DATABASE_URL is missing (NODE_ENV=${env}, tried ${envFile}).`);
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        datasources: { db: { url: process.env.DATABASE_URL } },
    });

if (env !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
