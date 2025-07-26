import { sessionOptions } from "@/lib/session";
import { getIronSession, IronSessionData } from "iron-session";
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getFieldValue } from "@/utils/parseApiField";
import axios from "axios";
import { ACCESS_PERMISSION } from "@prisma/client";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { apiHelpers } from "@/lib/server/responseHelpers";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [
            ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
        ],
        filters: {
            [ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY]: {
                priority: 1,
                filter: {}
            }
        },
    }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        apiHelpers.methodNotAllowed(res, "Not allowed");
        return;
    }

    try {
        const company_id: number = parseInt(getFieldValue(req.query.companyId));

        if (!company_id) {
            apiHelpers.badRequest(res, "Bad Request: Missing company_id");
            return;
        }

        // Calculate any change
        const nothandlednoti = await prisma.notification.findMany({
            where: {
                companyId: company_id,
                is_handled: false
            },
        });

        const isChange = nothandlednoti.length > 0;

        // Check if there is an existing summary entry
        const existingSummary = await prisma.summary.findUnique({
            where: {
                companyId: company_id
            }
        });

        if (existingSummary) {
            // If there is an entry and no change, return the existing summary
            if (!isChange) {
                apiHelpers.success(res, {
                    summary: existingSummary.summary
                });
                return;
            }

            // If there is an entry but there are changes, update the summary
            const db_jdLinks = await prisma.company_jd.findMany({
                where: { company_id },
                select: { pdf_path: true },
            });

            const db_compendiumLinks = await prisma.company_compendium.findMany({
                where: { company_id },
                include: {
                    compedium_pdf: {
                        select: { pdf_path: true }
                    }
                }
            });

            const jdLinks = db_jdLinks.map(link => link.pdf_path);
            const compendiumLinks = db_compendiumLinks.flatMap((link => (link.compedium_pdf.map(pdf => pdf.pdf_path) || [])));

            // Update the summary with new JD and compendium links
            const updatedSummary = `${company_id} ${jdLinks.join("'")} ${compendiumLinks.join("'")}`;

            await prisma.summary.update({
                where: {
                    companyId: company_id
                },
                data: {
                    summary: updatedSummary
                }
            });

            apiHelpers.success(res, {
                summary: updatedSummary,
                company_id,
                jdLinks,
                compendiumLinks
            });

        } else {
            // If there is no entry and there are changes, create a new summary
            if (isChange) {
                const db_jdLinks = await prisma.company_jd.findMany({
                    where: { company_id },
                    select: { pdf_path: true },
                });

                const db_compendiumLinks = await prisma.company_compendium.findMany({
                    where: { company_id },
                    include: {
                        compedium_pdf: {
                            select: { pdf_path: true }
                        }
                    }
                });

                const jdLinks = db_jdLinks.map(link => link.pdf_path);
                const compendiumLinks = db_compendiumLinks.flatMap((link => (link.compedium_pdf.map(pdf => pdf.pdf_path) || [])));

                const datasummary = await prisma.summary.create({
                    data: {
                        summary: `${company_id} ${jdLinks.join("'")} ${compendiumLinks.join("'")}`,
                        companyId: company_id
                    }
                });

                if (!datasummary) {
                    apiHelpers.error(res, "Couldn't create summary", 400);
                    return;
                }

                apiHelpers.success(res, {
                    summary: datasummary.summary,
                    company_id,
                    jdLinks,
                    compendiumLinks
                });
            } else {
                apiHelpers.success(res, {
                    message: "No changes found, no summary created."
                });
            }
        }

        return;

    } catch (error) {
        console.error(error);
        apiHelpers.error(res, "Internal Server Error", 500);
        return;
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);
