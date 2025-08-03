import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getFieldValue } from "@/utils/parseApiField";
import { ACCESS_PERMISSION } from "@prisma/client";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { apiHelpers } from "@/lib/server/responseHelpers";
import axios from "axios";
import { htmlToLexicalJSON } from "@/utils/htmlToLexicalJson";

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

        const existingSummary = await prisma.summary.findUnique({
            where: {
                companyId: company_id
            },
            select: {
                is_changed: true,
                company: {
                    select: {
                        company_full: true
                    }
                },
                summary: true
            }
        });

        if (existingSummary) {
            // If there is an entry and no change, return the existing summary
            if (!existingSummary.is_changed) {
                apiHelpers.success(res, {
                    summary: existingSummary.summary,
                });
                return;
            }

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

            const summaryresp = await axios.post(`${process.env.NEXT_PUBLIC_AI_URL}/company/summary`, {
                companyId: String(company_id),
                jdLinks: jdLinks.map(link => decodeURIComponent(link)),
                compendiumLinks: compendiumLinks.map(link => decodeURIComponent(link)),
                fullName: existingSummary.company.company_full
            });

            if (!summaryresp) {
                apiHelpers.error(res, "Couldn't create summary", 400);
                return;
            }

            if (summaryresp.status !== 200) {
                apiHelpers.error(res, "Failed to generate summary", 500);
                return;
            }

            const updatedSummary = JSON.stringify(htmlToLexicalJSON(summaryresp.data));

            await prisma.summary.update({
                where: {
                    companyId: company_id
                },
                data: {
                    summary: updatedSummary,
                    is_changed: false,
                }
            });

            apiHelpers.success(res, {
                summary: updatedSummary
            });
            return;

        } else {
            // If there is no entry and there are changes, create a new summary
            const summary = await prisma.summary.create({
                data: {
                    companyId: company_id,
                    is_changed: true,
                    summary: "",
                }, include: {
                    company: {
                        select: {
                            company_full: true
                        }
                    }
                }
            });

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

            const summaryresp = await axios.post(`${process.env.NEXT_PUBLIC_AI_URL}/company/summary`, {
                companyId: String(company_id),
                jdLinks: jdLinks.map(link => decodeURIComponent(link)),
                compendiumLinks: compendiumLinks.map(link => decodeURIComponent(link)),
                fullName: summary.company.company_full
            });

            if (!summaryresp) {
                apiHelpers.error(res, "Couldn't create summary", 400);
                return;
            }

            if (summaryresp.status !== 200) {
                apiHelpers.error(res, "Failed to generate summary", 500);
                return;
            }

            const lexicalJson = htmlToLexicalJSON(summaryresp.data);
            const updatedSummary = JSON.stringify(lexicalJson);

            await prisma.summary.update({
                where: {
                    companyId: company_id
                },
                data: {
                    summary: updatedSummary,
                    is_changed: false,
                }
            });

            apiHelpers.success(res, {
                summary: updatedSummary
            });
            return;
        }
    } catch (error) {
        console.error(error);
        apiHelpers.error(res, "Internal Server Error", 500);
        return;
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);
