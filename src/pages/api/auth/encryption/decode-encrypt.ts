import type { NextApiRequest, NextApiResponse } from "next";
import { decrypt } from "@/utils/shared/secureKey";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ success: false, error: "Method Not Allowed" });
    }

    const { auth } = req.query;

    if (!auth || typeof auth !== "string") {
        return res.status(400).json({ success: false, error: "Missing or invalid 'auth' query parameter" });
    }

    try {
        const decoded = decodeURIComponent(auth);
        const result = decrypt(decoded);

        if (!result.success) {
            return res.status(401).json({ success: false, error: result.error });
        }

        return res.status(200).json({
            success: true,
            key: result.key,
            id: result.id,
        });
    } catch (err) {
        console.error("[Decryption Error]", err);
        return res.status(500).json({ success: false, error: "Decryption failed" });
    }
}
