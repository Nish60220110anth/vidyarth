import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";
import toast from "react-hot-toast";
import { baseUrl } from "../config";
import { NewsEntry } from "@/components/MySection";

const getShortlistsBySession = async (count: number) => {
    try {
        const res = await axios.get(`/api/shortlists/?count=${count}`, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.ENABLE_MY_SECTION
            }
        });

        if (!res.data.success) {
            console.error("Failed to fetch shortlists:", res.data.error);
            toast.error("Failed to fetch shortlists");
            return null;
        }

        return res.data.data;
    } catch (err: any) {
        console.error("Error fetching shortlists:", err);
        toast.error("Error fetching shortlists");
        return null;
    }
}

const getNewsForCompanies = async (companyQueryParams: string) => {
    try {
        const res = await axios.get(`${baseUrl}/api/news-for-my-section/?${companyQueryParams}`, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.ENABLE_MY_SECTION
            }
        });

        if (!res.data.success) {
            console.error("Failed to fetch news:", res.data.error);
            toast.error("Failed to fetch news");
            return [];
        }

        const newsList = res.data.data;
        const transformed = newsList.map((news: any): NewsEntry => ({
            title: news.title,
            link_to_source: news.link_to_source,
            content: news.content,
            company_ids: news.companies.map((g: any) => {
                return g.company.id;
            }),
            image_url: news.image_url,
            domains: news.domains.map((d: any) => d.domain),
            subdomain_tag: news.subdomain_tag,
            news_tag: news.news_tag,
            created_at: new Date(news.created_at)
        }));

        console.log("Fetched news:", transformed);

        return transformed;
    } catch (error) {
        console.error("Error fetching news:", error);
        toast.error("Failed to fetch news");
        return [];

    }
}

export {
    getShortlistsBySession,
    getNewsForCompanies
}