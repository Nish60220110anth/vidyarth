import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { ACCESS_PERMISSION } from "@prisma/client";
import { apiHelpers } from "@/lib/server/responseHelpers";

const CV_DIRECTORY = path.join(process.cwd());

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [
            ACCESS_PERMISSION.ADMIN,
            ACCESS_PERMISSION.ENABLE_MY_CV
        ],
        filters: {
            [ACCESS_PERMISSION.ADMIN]: {
                priority: 1,
                filter: {},
            },
            [ACCESS_PERMISSION.ENABLE_MY_CV]: {
                priority: 1,
                filter: {},
            }
        },
    }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {

    const file = req.query.file;

    if (!file || typeof file !== "string") {
        apiHelpers.badRequest(res, "Missing or invalid 'file' query parameter")
        return;
    }

    const normalizedPath = path.normalize(file).replace(/^(\.\.(\/|\\|$))+/, "");

    const fullPath = path.join(CV_DIRECTORY, normalizedPath);

    try {
        if (!fs.existsSync(fullPath)) {
            apiHelpers.notFound(res, "File not found")
            return;
        }

        const fileContent = fs.readFileSync(fullPath);
        const ext = path.extname(fullPath).toLowerCase();

        const mimeType =
            ext === ".pdf" ? "application/pdf"
                : ext === ".docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    : "application/octet-stream";

        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Disposition", `inline; filename="${path.basename(fullPath)}"`);
        res.status(200).send(fileContent);
    } catch (err) {
        console.error("File read error:", err);
        apiHelpers.error(res, "Internal server error")
        return;
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);
