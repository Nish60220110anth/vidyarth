// pages/api/proxy-file.ts

import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { url } = req.query;

    if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "Missing or invalid URL" });
    }

    try {
        const fileRes = await fetch(decodeURIComponent(url));
        const buffer = await fileRes.arrayBuffer();
        const contentType = fileRes.headers.get("content-type") || "application/octet-stream";

        res.setHeader("Content-Type", contentType);
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error("Proxy error:", error);
        res.status(500).json({ error: "Failed to fetch file from remote source." });
    }
}
  