import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { ACCESS_PERMISSION, DOMAIN, USER_ROLE } from "@prisma/client";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { apiHelpers } from "@/lib/server/responseHelpers";
import { getFieldValue } from "@/utils/parseApiField";
import { getIronSession, IronSessionData } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { getUserByEmail, getUserById } from "@/lib/server/services/user";
import { getStudentCVs, getStudentIDByCVId, updateStudentCV } from "@/lib/server/services/studentCV";

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

type PutBody = {
    cv_id: number;
    domain?: string;
    comment?: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "GET") {
        const { user_id } = req.query;

        if (!user_id) {
            apiHelpers.badRequest(res, "Missing or invalid 'user_id' query parameter");
            return;
        }

        const id = Number(getFieldValue(user_id))

        try {
            await getUserById(id);
            const cvs = await getStudentCVs(id);
            apiHelpers.success(res, { data: cvs });
            return;
        } catch (error) {
            apiHelpers.error(res, "Internal server error", 500);
            return;
        }

    } else if (req.method === "PUT") {
        const { cv_id, domain, comment }: PutBody = req.body;

        if (!cv_id) {
            apiHelpers.badRequest(res, "Missing or invalid 'cv_id'")
            return;
        }

        const ncvid = Number(getFieldValue(cv_id));
        const session = await getIronSession<IronSessionData>(req, res, sessionOptions);

        try {

            if (session.role === USER_ROLE.STUDENT) {
                const user = await getUserByEmail(session.email);
                const cv_user_id = await getStudentIDByCVId(ncvid);

                if (cv_user_id !== user.id) {
                    apiHelpers.unauthorized(res, "UnAuthorized user_id. You can only update your own CV.")
                    return;
                }
            }

            const updated = await updateStudentCV(ncvid, domain, comment);

            apiHelpers.success(res, { data: updated })
            return;
        } catch (error) {
            console.error("Error updating CV:", error);
            apiHelpers.error(res, "Internal server error", 500)
            return;
        }

    } else {
        apiHelpers.methodNotAllowed(res, "Method not allowed")
        return;
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);