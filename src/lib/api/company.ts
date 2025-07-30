import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";
import { toast } from "react-hot-toast";
import { baseUrl } from "../config";
import { JDEntry } from "@/types/panes";

const fetchCompanyListWithPermission = async (perm: ACCESS_PERMISSION) => {
    try {
        const res = await axios.get(`${baseUrl}/api/company/`, {
            headers: {
                'x-access-permission': perm
            }
        });

        if (!res.data.success) {
            toast.error(res.data.error);
            return [];
        }

        return res.data.data;
    } catch (err: any) {
        console.error("Error fetching company list:", err);
        toast.error("Failed to fetch company list. Please try again later.");
        return [];
    }
};

const fetchCompanyInfo = async (companyId: number, perm: ACCESS_PERMISSION) => {
    try {
        const res = await axios.get(`${baseUrl}/api/company/?cid=${companyId}`, {
            headers: {
                'x-access-permission': perm
            }
        });

        if (!res.data.success) {
            toast.error(res.data.error);
            return null;
        }

        return res.data.data[0]; // api uses findMany, so we return the first item
    } catch (err: any) {
        console.error("Error fetching company info:", err);
        toast.error("Failed to fetch company info. Please try again later.");
        return null;
    }
}

const fetchJDByCompanyID = async (companyId: number) => {
    try {
        const res = await axios.get(`${baseUrl}/api/jd?cid=${companyId}`, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
            }
        });

        if (!res.data.success) {
            toast.error(res.data.error);
            return;
        }

        const transformed = res.data.allJDs.map((jd: any): JDEntry => ({
            company: jd.company.company_full,
            role: jd.role,
            cycle_type: jd.placement_cycle.placement_type,
            year: jd.placement_cycle.year,
            jd_pdf_path: jd.pdf_path,
            domains: jd.domains.map((d: any) => d.domain),
        }));

        return transformed;
    } catch (err: any) {
        console.error("Error fetching JDs:", err);
        toast.error(err || "Error fetching JDs");
        return [];
    }
};

export {
    fetchCompanyListWithPermission,
    fetchCompanyInfo,
    fetchJDByCompanyID
};