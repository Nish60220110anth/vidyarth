import { Company } from "@/components/CompanySearchDropDown";

export interface JDPaneProps {
    props: {
        jds: Partial<JDEntry>[];
    };
}


export interface NewsPaneProps {
    props: {
        news: Partial<NewsEntry>[];
    };
}


export interface VideoPaneProps {
    props: {
        videos: Partial<VideoEntry>[];
    }
}


export interface JDEntry {
    company: string,
    role: string,
    cycle_type: string,
    year: string,
    jd_pdf_path: string,
    domains: string[],
}

export interface VideoEntry {
    source: string,
    title: string,
    embed_id: string,
    thumbnail_url: string,
    updated_at: Date,
}

export interface NewsEntry {
    title: string,
    source_link: string,
    created_at: Date,
    content: string,
    image_url: string,
    domains: string[],
    news_tag: string,
    subdomain_tag: string,
}

export interface OverviewEntry {
    company_id: number,
    company: Company
}

export interface CompendiumEntry {
    company_id: number,
    company: Company
}