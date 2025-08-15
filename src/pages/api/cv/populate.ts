import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import fs from "fs";
import path from "path";
import { ACCESS_PERMISSION, USER_ROLE } from "@prisma/client";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";

const cv_relative_path = path.join("src", "assets", "CVs")
const CV_DIRECTORY = path.join(process.cwd(), cv_relative_path);

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    put: {
        permissions: [
            ACCESS_PERMISSION.ADMIN,
        ]
    },
    delete: {
        permissions: [ACCESS_PERMISSION.ADMIN],
    }
};


async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "PUT") {
        try {
            const folders = fs.readdirSync(CV_DIRECTORY).filter(folder => {
                return fs.statSync(path.join(CV_DIRECTORY, folder)).isDirectory();
            });

            for (const folder of folders) {
                const folderPath = path.join(CV_DIRECTORY, folder);
                const files = fs.readdirSync(folderPath);

                const pcomid = folder;

                const user = await prisma.user.findFirst({
                    where: { pcomid, role: USER_ROLE.STUDENT },
                });

                if (!user) {
                    console.warn(`No user found for pcom_id: ${pcomid}`);
                    continue;
                }

                for (const file of files) {
                    const fullPath = path.join(folderPath, file);
                    const stat = fs.statSync(fullPath);
                    if (!stat.isFile()) continue;

                    const isPrimary = /primary/i.test(file);
                    const versionMatch = file.match(/(\d+)/g);
                    const version = isPrimary ? 1 : versionMatch ? parseInt(versionMatch[versionMatch.length - 1]) : 1;

                    await prisma.student_cv.create({
                        data: {
                            userId: user.id,
                            domain: null,
                            cv_path: path.join(cv_relative_path, pcomid, file),
                            cv_filename: file,
                            version,
                            is_primary: isPrimary,
                            comment: null,
                        },
                    });
                }
            }

            return res.status(200).json({ message: "Student CVs populated successfully." });

        } catch (error) {
            console.error("Error populating CVs:", error);
            return res.status(500).json({ error: "Internal server error." });
        }

    } else if (req.method === "DELETE") {
        try {
            await prisma.student_cv.deleteMany({});
            return res.status(200).json({ message: "All student CVs deleted successfully." });
        } catch (error) {
            console.error("Error deleting CVs:", error);
            return res.status(500).json({ error: "Internal server error." });
        }

    } else {
        return res.status(405).json({ error: "Method not allowed." });
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);
