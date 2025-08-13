import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";
import { toast } from "react-hot-toast";
import { baseUrl } from "../config";
import { JDEntry, NewsEntry, VideoEntry } from "@/types/panes";

const fetchCompanyListWithPermission = async (perm: ACCESS_PERMISSION) => {
    try {
        const res = await axios.get(`${baseUrl}/api/company/?t=${Date.now()}`, {
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
            console.error("Error fetching JDs:", res.data.error);
            toast.error(res.data.error);
            return [];
        }

        const activeCycle = res.data.active;

        const transformed = res.data.data.map((jd: any): JDEntry => ({
            company: jd.company.company_full,
            role: jd.role,
            cycle_type: jd.placement_cycle.placement_type,
            year: jd.placement_cycle.year,
            jd_pdf_path: jd.pdf_path,
            domains: jd.domains.map((d: any) => d.domain),
            is_current: activeCycle ? activeCycle.id === jd.placement_cycle.id : false,
            jd_pdf_name: jd.pdf_name
        }));

        return transformed;
    } catch (err: any) {
        console.error("Error fetching JDs:", err);
        toast.error(err || "Error fetching JDs");
        return [];
    }
};

const fetchVideosByCompanyID = async (companyId: number) => {
    try {
        const res = await axios.get(`${baseUrl}/api/video?cid=${companyId}`, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
            }
        });

        if (!res.data.success) {
            console.error("Error fetching videos:", res.data.error);
            toast.error(res.data.error || "Error fetching Videos")
            return [];
        }

        const transformed = res.data.data.map((video: any): VideoEntry => ({
            source: video.source,
            title: video.title,
            embed_id: video.embed_id,
            thumbnail_url: video.thumbnail_url,
            updated_at: new Date(video.updated_at),
        }));

        return transformed;
    } catch (err: any) {
        toast.error(err || "Error fetching Videos");
        console.error("Error fetching videos:", err);
        return [];
    }
};

const fetchNewsByCompanyID = async (companyId: number) => {
    try {

        const res = await axios.get(`${baseUrl}/api/news?cid=${companyId}`, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
            }
        });

        if (!res.data.success) {
            console.error("Error fetching news:", res.data.error);
            toast.error(res.data.error);
            return [];
        }

        const transformed = res.data.data.map((news: any): NewsEntry => ({
            title: news.title,
            content: news.content,
            created_at: new Date(news.created_at),
            image_url: news.image_url,
            source_link: news.link_to_source,
            domains: news.domains.map((d: any) => d.domain),
            news_tag: news.news_tag,
            subdomain_tag: news.subdomain_tag,
        }));

        return transformed;
    } catch (err: any) {
        toast.error(err || "Failed to load news");
        console.error("Error fetching news:", err);
        return [];
    }
}

export {
    fetchCompanyListWithPermission,
    fetchCompanyInfo,
    fetchJDByCompanyID,
    fetchVideosByCompanyID,
    fetchNewsByCompanyID
};