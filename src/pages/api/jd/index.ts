import { NextApiRequest, NextApiResponse } from "next";
import { DOMAIN, ACCESS_PERMISSION, NOTIFICATION_TYPE, NOTIFICATION_SUBTYPE, NOTIFICATION_SOURCE_INITIATOR } from "@prisma/client";
import { bucket } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import formidable from "formidable";
import fs from "fs";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { apiHelpers } from "@/lib/server/responseHelpers";
import { createNotification } from "@/lib/server/notificationSink";
import { generateSecureURL } from "@/utils/shared/secureUrlApi";
import { baseUrl } from "@/lib/config";
import { z } from "zod";
import { getActiveCycle } from "@/lib/server/services/cycle";
import { createDefaultJD, createDefaultJDDomain, deleteDomainsByJDId, deleteJD, getJDByID, updateJD } from "@/lib/server/services/jd";
import { ToBool, ToDomains, ToInt, ToStr } from "@/lib/server/zod_utils";

export const config = {
    api: {
        bodyParser: false,
    },
};

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [
            ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY,
            ACCESS_PERMISSION.MANAGE_COMPANY_JD
        ],
        filters: {
            [ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY]: {
                priority: 1,
                filter: {
                    is_active: true,
                    placement_cycle: {
                        status: "OPEN"
                    }
                },
            },
            [ACCESS_PERMISSION.MANAGE_COMPANY_JD]: {
                priority: 1,
                filter: {},
            },
        },
    },
    put: {
        permissions: [ACCESS_PERMISSION.MANAGE_COMPANY_JD],
    },
    delete: {
        permissions: [ACCESS_PERMISSION.MANAGE_COMPANY_JD],
    },
    post: {
        permissions: [ACCESS_PERMISSION.MANAGE_COMPANY_JD],
    },
};

const parseForm = async (req: NextApiRequest): Promise<{ fields: any; files: any }> => {
    return new Promise((resolve, reject) => {
        const form = formidable({
            multiples: false, maxFileSize: 10 * 1024 * 1024,
            allowEmptyFiles: false
        });
        form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            resolve({ fields, files });
        });
    });
};

const PostJDBodySchema = z
    .object({
        is_default: z.preprocess((val) => {
            const v = Array.isArray(val) ? val[0] : val;
            if (typeof v === "string") return v.toLowerCase() === "true";
            return v;
        }, z.literal(true)),
    })
    .strict();

const PutJDMultiPartSchema = z
    .object({
        is_default: ToBool,
        id: ToStr,
        company_id: ToInt,
        placement_cycle_id: ToInt,
        role: ToStr,
        pdf_name: ToStr.optional(),
        is_active: ToBool,
        keep_existing_pdf: ToBool,
        domains: ToDomains,
        pdf_path: ToStr.optional(),
    })
    .strict();

const GetQuerySchema = z.object({
    cid: ToInt.optional().refine((val) => !val || (val > 0), {
        message: "cid must be a positive integer or undefined",
    }),
});

const DeleteQuerySchema = z.object({
    id: z.string(),
}).strict();

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "POST") {
        const { fields } = await parseForm(req);
        const parsedBody = PostJDBodySchema.safeParse(fields);

        if (!parsedBody.success) {
            apiHelpers.badRequest(res, "Invalid request body");
            return;
        }

        const { is_default } = parsedBody.data;

        if (is_default) {

            const defaultJD = await prisma.company_jd.findFirst({
                where: { company_id: 0 },
                include: {
                    company: true,
                    placement_cycle: true,
                    domains: true,
                },
            });

            if (defaultJD) {
                apiHelpers.success(res, { data: defaultJD });
                return;
            }
        } else {
            console.warn("Not allowed to create non-default JDs via this endpoint");
            apiHelpers.badRequest(res, "Creating non-default JDs is not allowed via this endpoint");
            return;
        }

        const activeCycle = await getActiveCycle();

        if (!activeCycle) {
            apiHelpers.error(res, "No active placement cycle found!", 404);
            return;
        }

        const defaultJD = await createDefaultJD(activeCycle.id);
        await createDefaultJDDomain(defaultJD.id);
        const refreshedJD = await getJDByID(defaultJD.id);

        apiHelpers.success(res, { data: refreshedJD })
        return;
    }
    else if (req.method === "PUT") {
        const { fields, files } = await parseForm(req);

        const parsedBody = PutJDMultiPartSchema.safeParse({
            ...fields,
            domains: Array.isArray(fields.domains) ? fields.domains[0] : fields.domains,
        });

        if (!parsedBody.success) {
            apiHelpers.badRequest(res, `Invalid request body: ${parsedBody.error.message}`);
            return;
        }

        const { id, company_id, placement_cycle_id, role, pdf_name, is_active, keep_existing_pdf, domains } = parsedBody.data;

        let pdf_path = "";
        let firebase_path = "";

        if (files.pdf && !keep_existing_pdf) {
            const file = files.pdf[0];
            const orig = file.originalFilename || "jd.pdf"
            const dest = `jds/${Date.now()}-${orig}`;
            const fileRef = bucket.file(dest);

            await new Promise<void>((resolve, reject) => {
                fs.createReadStream(file.filepath)
                    .pipe(
                        fileRef.createWriteStream({
                            metadata: { contentType: file.mimetype || "application/pdf" },
                        })
                    )
                    .on("error", reject)
                    .on("finish", resolve);
            });


            // await fileRef.makePublic();
            // const publicUrl = fileRef.publicUrl();

            const [signedUrl] = await fileRef.getSignedUrl({
                action: "read",
                expires: "03-01-2030",
            });

            pdf_path = signedUrl;
            firebase_path = dest;

            fs.promises.unlink(file.filepath).catch(() => { });
        }

        const oldJd = await getJDByID(id);

        const refreshedJD = await updateJD(id, {
            company_id,
            placement_cycle_id,
            role,
            pdf_path,
            pdf_name,
            firebase_path,
            is_active,
            keep_existing_pdf,
            domains: domains.map((d) => d as DOMAIN),
        });

        if (is_active) {
            const secureUrlResp = await generateSecureURL("COMPANY", company_id)

            if (secureUrlResp.success) {
                createNotification({
                    type: NOTIFICATION_TYPE.COMPANY_CONTENT,
                    subtype: NOTIFICATION_SUBTYPE.JD,
                    initiator: oldJd.is_active ? NOTIFICATION_SOURCE_INITIATOR.UPDATED : NOTIFICATION_SOURCE_INITIATOR.ADDED,
                    companyId: company_id,
                    links: [{
                        link: `${baseUrl}/dashboard/?auth=${encodeURIComponent(secureUrlResp.url)}&tab=Job+Description`,
                        link_name: "job_description"
                    }]
                });
            }
        }

        apiHelpers.success(res, { data: refreshedJD })
        return;
    }
    else if (req.method === "GET") {
        const parsedQuery = GetQuerySchema.safeParse(req.query);

        if (!parsedQuery.success) {
            apiHelpers.badRequest(res, `Invalid query parameters: ${parsedQuery.error.message}`);
            return;
        }

        const { cid } = parsedQuery.data;

        const permissionFilter = (req as any).filter ?? {};
        const filters: any = {
            ...permissionFilter
        };

        if (cid) {
            filters.company_id = cid;
        }

        const allJDs = await prisma.company_jd.findMany({
            where: {
                ...filters,
            },
            include: {
                company: {
                    include: {
                        domains: true,
                    },
                },
                placement_cycle: true,
                domains: true,
            },
            orderBy: {
                updated_at: "desc",
            },
        });

        apiHelpers.success(res, { data: allJDs })
        return;
    }
    else if (req.method === "DELETE") {
        const parsedQuery = DeleteQuerySchema.safeParse(req.query);

        if (!parsedQuery.success) {
            apiHelpers.badRequest(res, `Invalid query parameters: ${parsedQuery.error.message}`);
            return;
        }

        const { id: jdId } = parsedQuery.data;
        const jd = await getJDByID(jdId);

        if (jd.firebase_path) {
            const fileRef = bucket.file(jd.firebase_path);
            try {
                await fileRef.delete();
            } catch (err: any) {
                console.warn("Failed to delete file from Firebase:", err.message);
            }
        }

        const oldJd = await getJDByID(jdId);

        await deleteDomainsByJDId(jdId);
        await deleteJD(jdId);

        if (oldJd.is_active) {
            const secureUrlResp = await generateSecureURL("COMPANY", oldJd.company_id);

            if (secureUrlResp.success) {
                createNotification({
                    type: NOTIFICATION_TYPE.COMPANY_CONTENT,
                    subtype: NOTIFICATION_SUBTYPE.JD,
                    initiator: NOTIFICATION_SOURCE_INITIATOR.DELETED,
                    companyId: oldJd.company_id,
                    links: [{
                        link: `${baseUrl}/dashboard/?auth=${encodeURIComponent(secureUrlResp.url)}&tab=Job+Description`,
                        link_name: "job_description"
                    }]
                });
            }
        }

        apiHelpers.success(res, {})
        return;
    }
    else {
        apiHelpers.methodNotAllowed(res, req.method);
        return;
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);