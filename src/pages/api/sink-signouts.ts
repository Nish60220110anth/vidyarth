// pages/api/sink-signouts.ts

import type { NextApiRequest, NextApiResponse } from "next";
import Cors from "cors";
import { prisma } from "@/lib/prisma";
import { USER_ROLE } from "@prisma/client";

const cors = Cors({
    origin: process.env.NEXT_PUBLIC_CHITRAGUPTA_URL,
    methods: ["POST", "OPTIONS"],
    credentials: true
});

function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: any) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result: any) => {
            return result instanceof Error ? reject(result) : resolve(result);
        });
    });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await runMiddleware(req, res, cors);

    if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
    }

    if (req.method === "POST") {
        const payload = req.body.signouts;

        const inserted = [];
        const errors = [];

        for (const entry of payload) {
            const { pcom_id, signout_type } = entry;

            try {
                const user = await prisma.user.findFirst({
                    where: {
                        pcomid: String(pcom_id),
                        is_active: true,
                        is_verified: true,
                        role: USER_ROLE.STUDENT
                    },
                });

                if (!user) {
                    errors.push({ pcom_id, error: "User not found" });
                    continue;
                }

                const signout = await prisma.signouts.upsert({
                    where: { pcomid: pcom_id },
                    update: {
                        signout_type,
                    },
                    create: {
                        pcomid: pcom_id,
                        userId: user.id,
                        signout_type,
                    },
                });

                inserted.push({ pcom_id, signout_id: signout.id });
            } catch (err: any) {
                errors.push({ pcom_id, error: err.message });
            }
        }

        res.status(200).json({
            success: true,
            inserted,
            errors,
        });
        return;
    }

    res.status(405).json({ error: "Method not allowed" });
}
