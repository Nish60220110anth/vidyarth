// /pages/api/company/all-upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm } from "formidable";
import fs from "fs";
import { prisma } from "@/lib/prisma";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { ACCESS_PERMISSION } from "@prisma/client";
import { apiHelpers } from "@/lib/server/responseHelpers";
import ExcelJS from "exceljs";

export const config = {
    api: { bodyParser: false },
};

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    post: { permissions: [ACCESS_PERMISSION.MANAGE_COMPANY_LIST] },
};

const EXCEL_TYPES = new Set([
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
]);

const norm = (s: any) =>
    String(typeof s === "object" && s?.text ? s.text : s ?? "")
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, "");

const HEADER_MAP: Record<string, "id" | "company_name" | "company_full" | "is_legacy" | "is_featured" | "logo_url"> = {
    id: "id",
    companyname: "company_name",
    fullname: "company_full",
    legacy: "is_legacy",
    featured: "is_featured",
    logourl: "logo_url",
};

function readCellString(cell: ExcelJS.Cell | undefined): string {
    if (!cell) return "";
    const v = cell.value as any;
    if (v == null) return "";
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v === "object") {
        if (v.text) return String(v.text);
        if (v.hyperlink) return String(v.hyperlink);
        if (v.richText && Array.isArray(v.richText)) return v.richText.map((t: any) => t.text).join("");
        if (v.result != null) return String(v.result);
    }
    return String(v);
}

function parseBoolean(value: string): boolean | null {
    const s = value.trim().toLowerCase();
    if (["yes", "y", "true", "1"].includes(s)) return true;
    if (["no", "n", "false", "0"].includes(s)) return false;
    return null;
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {

    const form = new IncomingForm({
        keepExtensions: true,
        multiples: false,
        maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    form.parse(req, async (err, _fields, files) => {
        if (err) {
            apiHelpers.error(res, "Server couldn't read request", 500, { error: err });
            return;
        }

        const raw = Array.isArray(files.file) ? files.file[0] : (files.file as any);
        if (!raw || !raw.filepath) {
            apiHelpers.badRequest(res, 'Missing "file"');
            return;
        }
        const mimetype = String(raw.mimetype || "");
        const okType = EXCEL_TYPES.has(mimetype) || /\.xlsx?$/i.test(raw.originalFilename || "");
        if (!okType) {
            apiHelpers.badRequest(res, "Please upload an .xlsx or .xls file");
            return;
        }
        if (!fs.existsSync(raw.filepath) || fs.statSync(raw.filepath).size === 0) {
            apiHelpers.badRequest(res, "Invalid or empty file");
            return;
        }

        const summary = {
            updated: 0,
            skipped: 0,
            errors: [] as { row: number; id?: number; error: string }[],
            missingHeaders: [] as string[],
        };

        try {
            const wb = new ExcelJS.Workbook();
            await wb.xlsx.readFile(raw.filepath);
            const ws = wb.worksheets[0];
            if (!ws) {
                apiHelpers.badRequest(res, "No worksheet found in workbook");
                return;
            }

            // Build header map from row 1
            const headerRow = ws.getRow(1);
            const colIndexByKey: Partial<Record<keyof typeof HEADER_MAP, number>> = {};
            headerRow.eachCell((cell, colNumber) => {
                const key = HEADER_MAP[norm(cell.value)];
                if (key) {
                    if (key === "id") colIndexByKey.id = colNumber;
                    if (key === "company_name") colIndexByKey.company_name = colNumber;
                    if (key === "company_full") colIndexByKey.company_full = colNumber;
                    if (key === "is_legacy") colIndexByKey.is_legacy = colNumber;
                    if (key === "is_featured") colIndexByKey.is_featured = colNumber;
                    if (key === "logo_url") colIndexByKey.logo_url = colNumber;
                }
            });

            if (!colIndexByKey.id) {
                apiHelpers.badRequest(res, 'Missing required "ID" column in header row');
                return;
            }

            const expected = ["Company Name", "Full Name", "Legacy", "Featured", "Logo URL"] as const;
            for (const label of expected) {
                const key = HEADER_MAP[norm(label)];
                if (!colIndexByKey[key]) summary.missingHeaders.push(label);
            }

            for (let r = 2; r <= ws.rowCount; r++) {
                const row = ws.getRow(r);
                const idRaw = readCellString(row.getCell(colIndexByKey.id!)).trim();
                const id = Number(idRaw);
                if (!id || Number.isNaN(id)) {
                    summary.skipped++;
                    if (idRaw) summary.errors.push({ row: r, error: `Invalid ID "${idRaw}"` });
                    continue;
                }

                const updates: any = {};
                if (colIndexByKey.company_name) {
                    const v = readCellString(row.getCell(colIndexByKey.company_name));
                    if (v !== "") updates.company_name = v;
                }
                if (colIndexByKey.company_full) {
                    const v = readCellString(row.getCell(colIndexByKey.company_full));
                    if (v !== "") updates.company_full = v;
                }
                if (colIndexByKey.is_legacy) {
                    const v = readCellString(row.getCell(colIndexByKey.is_legacy));
                    const b = parseBoolean(v);
                    if (b !== null) updates.is_legacy = b;
                }
                if (colIndexByKey.is_featured) {
                    const v = readCellString(row.getCell(colIndexByKey.is_featured));
                    const b = parseBoolean(v);
                    if (b !== null) updates.is_featured = b;
                }
                // if (colIndexByKey.logo_url) {
                //     const v = readCellString(row.getCell(colIndexByKey.logo_url));
                //     if (v !== "") updates.logo_url = v;
                // }

                if (Object.keys(updates).length === 0) {
                    summary.skipped++;
                    continue;
                }

                try {
                    await prisma.company.update({
                        where: { id },
                        data: updates,
                    });
                    summary.updated++;
                } catch (e: any) {
                    summary.errors.push({ row: r, id, error: e?.message || "Update failed" });
                }
            }

            apiHelpers.success(res, summary);
            console.log("Excel upload summary:", summary);
            return;
        } catch (e: any) {
            apiHelpers.error(res, e?.message || "Failed to process Excel", 500, { error: e });
            return;
        } finally {
            try {
                fs.unlinkSync(raw.filepath);
            } catch { }
        }
    });
};

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);
