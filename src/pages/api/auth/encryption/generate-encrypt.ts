import type { NextApiRequest, NextApiResponse } from "next";
import { encrypt } from "@/utils/secureKey";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Method Not Allowed" });
    }

    const { key, id } = req.body;

    if (!key || typeof id !== "number") {
        return res.status(400).json({ success: false, error: "Missing key or cid" });
    }

    try {
        const encrypted = encrypt(key, id);
        const url = `${encodeURIComponent(encrypted)}`;

        return res.status(200).json({
            success: true,
            url,
        });
    } catch (err) {
        console.error("[Encrypt Error]", err);
        return res.status(500).json({ success: false, error: "Encryption failed" });
    }
}
