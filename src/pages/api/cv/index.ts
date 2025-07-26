import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { ACCESS_PERMISSION, USER_ROLE } from "@prisma/client";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { apiHelpers } from "@/lib/server/responseHelpers";
import { getFieldValue } from "@/utils/parseApiField";
import { getIronSession, IronSession, IronSessionData } from "iron-session";
import { sessionOptions } from "@/lib/session";

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
    },
    put: {
        permissions: [ACCESS_PERMISSION.ADMIN, ACCESS_PERMISSION.ENABLE_MY_CV],
    }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "GET") {
        const { userid } = req.query;

        if (!userid) {
            apiHelpers.badRequest(res, "Missing or invalid 'userid' query parameter");
            return;
        }

        const id = parseInt(getFieldValue(userid))

        try {
            const user = await prisma.user.findUnique({
                where: { id, role: USER_ROLE.STUDENT },
            });

            if (!user) {
                apiHelpers.badRequest(res, "User not found for given userid");
                return;
            }

            const cvs = await prisma.student_cv.findMany({
                where: { userId: user.id },
                orderBy: { is_primary: 'desc' },
            });

            apiHelpers.success(res, { cvs });
            return;
        } catch (error) {
            apiHelpers.error(res, "Internal server error", 500);
            return;
        }

    } else if (req.method === "PUT") {
        const { cv_id, domain, comment } = req.body;

        if (!cv_id) {
            apiHelpers.badRequest(res, "Missing or invalid 'cv_id'")
            return;
        }

        const ncvid = parseInt(getFieldValue(cv_id));
        const session = await getIronSession<IronSessionData>(req, res, sessionOptions);

        if (session.role === USER_ROLE.STUDENT) {
            const user = await prisma.user.findUnique({
                where: {
                    email_id: session.email
                },
                select: {
                    id: true
                }
            })

            if (!user) {
                apiHelpers.unauthorized(res, "UnAuthorized")
                return;
            }

            const cvUser = await prisma.student_cv.findUnique({
                where: {
                    id: ncvid
                },
                select: {
                    userId: true
                }
            })

            if (cvUser?.userId !== user.id) {
                apiHelpers.unauthorized(res, "UnAuthorized")
                return;
            }
        }

        try {
            const updated = await prisma.student_cv.update({
                where: { id: ncvid },
                data: {
                    domain: domain || undefined,
                    comment: comment || undefined,
                },
            });

            apiHelpers.success(res, {})
            return;
        } catch (error) {
            apiHelpers.error(res, "Internal server error", 500)
            return;
        }

    } else {
        apiHelpers.methodNotAllowed(res, "Method not allowed")
        return;
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);