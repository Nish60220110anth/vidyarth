import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";
import { toast } from "react-hot-toast";
import { baseUrl } from "../config";
import { JDEntry, NewsEntry, VideoEntry } from "@/types/panes";

const api = axios.create({
    baseURL: baseUrl,
    timeout: 15000,
});

const authHeader = (perm?: ACCESS_PERMISSION) =>
    perm ? { "x-access-permission": perm } : undefined;

const errText = (err: any, fallback: string) =>
    (err?.response?.data?.error as string) ||
    (typeof err === "string" ? err : err?.message) ||
    fallback;

const fetchCompanyListWithPermission = async (perm: ACCESS_PERMISSION) => {
    try {
        const res = await api.get(`/api/company/all`, {
            params: { t: Date.now() },
            headers: authHeader(perm),
        });

        if (!res.data?.success) {
            return {
                success: false,
                error: res.data?.error || "Failed to fetch company list",
            };
        }

        return {
            success: true,
            data: res.data.data ?? [],
        };
    } catch (err: any) {
        return {
            success: false,
            error: errText(err, "Failed to fetch company list"),
        };
    }
};

const fetchCompanyInfo = async (companyId: number, perm: ACCESS_PERMISSION) => {
    try {
        const res = await api.get(`/api/company`, {
            params: { cid: companyId },
            headers: authHeader(perm),
        });

        if (!res.data?.success) {
            return {
                success: false,
                error: res.data?.error || "Failed to fetch company info",
            };
        }
        return {
            success: true,
            data: res.data.data[0] ?? {},
        };
    } catch (err: any) {

        return {
            success: false,
            error: errText(err, "Failed to fetch company info. Please try again later."),
        };
    }
};

const fetchJDByCompanyID = async (companyId: number) => {
    try {
        const res = await api.get(`/api/jd`, {
            params: { cid: companyId },
            headers: authHeader(ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY),
        });

        if (!res.data?.success) {
            toast.error(res.data?.error || "Error fetching JDs");
            return {
                success: false,
                error: res.data?.error || "Error fetching JDs",
            };
        }

        const activeCycle = res.data.active;
        const rows = Array.isArray(res.data.data) ? res.data.data : [];

        const transformed: JDEntry[] = rows.map((jd: any) => ({
            company: jd?.company?.company_full,
            role: jd?.role,
            cycle_type: jd?.placement_cycle?.placement_type,
            year: jd?.placement_cycle?.year,
            jd_pdf_path: jd?.pdf_path,
            domains: (jd?.domains ?? []).map((d: any) => d?.domain),
            is_current: activeCycle ? activeCycle.id === jd?.placement_cycle?.id : false,
            jd_pdf_name: jd?.pdf_name,
        }));

        return { success: true, data: transformed };
    } catch (err: any) {
        toast.error(errText(err, "Error fetching JDs"));
        return {
            success: false,
            error: errText(err, "Error fetching JDs"),
        };
    }
};

const fetchVideosByCompanyID = async (companyId: number) => {
    try {
        const res = await api.get(`/api/video`, {
            params: { cid: companyId },
            headers: authHeader(ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY),
        });

        if (!res.data?.success) {
            toast.error(res.data?.error || "Error fetching Videos");
            return {
                success: false,
                error: res.data?.error || "Error fetching Videos",
            };
        }

        const rows = Array.isArray(res.data.data) ? res.data.data : [];

        const transformed: VideoEntry[] = rows.map((video: any) => ({
            source: video?.source,
            title: video?.title,
            embed_id: video?.embed_id,
            thumbnail_url: video?.thumbnail_url,
            updated_at: new Date(video?.updated_at),
        }));

        return { success: true, data: transformed };
    } catch (err: any) {
        toast.error(errText(err, "Error fetching Videos"));
        return { success: false, error: errText(err, "Error fetching Videos") };
    }
};

const fetchNewsByCompanyID = async (companyId: number) => {
    try {
        const res = await api.get("/api/news", {
            params: { cid: companyId },
            headers: authHeader(ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY),
        });

        if (!res.data?.success) {
            toast.error(res.data?.error || "Failed to load news");
            return { success: false, error: res.data?.error || "Failed to load news" };
        }

        const rows = Array.isArray(res.data.data) ? res.data.data : [];

        const transformed: NewsEntry[] = rows.map((news: any) => ({
            title: news?.title,
            content: news?.content,
            created_at: new Date(news?.created_at),
            image_url: news?.image_url,
            source_link: news?.link_to_source,
            domains: (news?.domains ?? []).map((d: any) => d?.domain),
            news_tag: news?.news_tag,
            subdomain_tag: news?.subdomain_tag,
        }));

        return { success: true, data: transformed };
    } catch (err: any) {
        toast.error(errText(err, "Failed to load news"));
        return { success: false, error: errText(err, "Failed to load news") };
    }
};

export {
    fetchCompanyListWithPermission,
    fetchCompanyInfo,
    fetchJDByCompanyID,
    fetchVideosByCompanyID,
    fetchNewsByCompanyID,
};
