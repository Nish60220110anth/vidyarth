import { ACCESS_PERMISSION, Prisma } from "@prisma/client";
import axios from "axios";
import { toast } from "react-hot-toast";
import { baseUrl } from "../config";
import { JDEntryAll } from "@/components/ManageJD";

const fetchAllJDs = async () => {
    try {
        const res = await axios.get(`${baseUrl}/api/jd`, {
            headers: {
                "Content-Type": "application/json",
                "x-access-permission": ACCESS_PERMISSION.MANAGE_COMPANY_JD
            }
        });

        if (!res.data.success) {
            toast.error(res.data.message || "Failed to fetch JDs");
            return [];
        }

        if (!res.data.data || !Array.isArray(res.data.data)) {
            toast.error("Invalid response format for JDs");
            return [];
        }

        const transformed = res.data.data.map((jd: Prisma.company_jdGetPayload<{
            include: {
                company: { include: { domains: true } };
                placement_cycle: true;
                domains: true;
            };
        }>): JDEntryAll => ({
            id: jd.id,
            role: jd.role,
            pdf_path: jd.pdf_path,
            pdf_name: jd.pdf_name ? jd.pdf_name : undefined,
            active: jd.is_active,

            company_id: jd.company.id,
            company_full: jd.company.company_full,
            company_logo: jd.company.logo_url || "",
            company_name: jd.company.company_name,
            company_domains: (jd.company.domains || []).map((d: any) => d.domain),

            placement_cycle_id: jd.placement_cycle.id,
            placement_cycle_type: jd.placement_cycle.placement_type,

            domains: jd.domains,
        }));

        return transformed;

    } catch (error) {
        console.error("Failed to fetch JDs:", error);
        toast.error("Failed to fetch Job Descriptions. Please try again later.");
        return [];
    }
}

const deleteJDById = async (jdId: string, label: string) => {
    try {

        const res = await axios.delete(`${baseUrl}/api/jd`, {
            params: { id: jdId }, headers: {
                "x-access-permission": ACCESS_PERMISSION.MANAGE_COMPANY_JD
            }
        });

        if (!res.data.success) {
            toast.error(res.data.message || `Failed to delete JD: ${label}`);
            return false;
        }

        toast.success(`Successfully deleted JD: ${label}`);
        return true;
    } catch (error) {
        console.error("Failed to delete JD:", error);
        toast.error(`Failed to delete JD: ${label}. Please try again later.`);
        return false;
    }
}

export {
    fetchAllJDs,
    deleteJDById
}