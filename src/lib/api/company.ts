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

/* ------------------------------ Company list ------------------------------ */

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

/* ------------------------------ Company info ------------------------------ */

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

/* --------------------------------- JDs ------------------------------------ */

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

/* -------------------------------- Videos ---------------------------------- */

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

/* --------------------------------- News ----------------------------------- */
/** Cursor for backend pagination (created_at desc, id desc) */
export type NewsPageCursor = { cursor_id?: number; cursor_ts?: string } | null;
export type NewsPageInfo = { has_more: boolean; next_cursor: NewsPageCursor };

export type FetchNewsOptions = {
    /** Search on title/content */
    title?: string;
    /** ISO date (YYYY-MM-DD or full ISO). Inclusive start. */
    from?: string;
    /** ISO date or ISO datetime. Inclusive end. */
    to?: string;
    /** News domain tag filter (BUSINESS/WORLD/TECHNOLOGY/COMPANY/…) */
    domainTag?: string;
    /** Optional subdomain tag (if you enable on backend) */
    subdomainTag?: string;
    /** Page size (default 24, max 100 server side) */
    limit?: number;
    /** Cursor for next page (from previous response.page.next_cursor) */
    cursor?: NewsPageCursor;
    /** Optional AbortSignal for cancellation */
    signal?: AbortSignal;
};

/**
 * New paginated fetch for virtualization / infinite scroll.
 * Returns { data, page } where page has { has_more, next_cursor }.
 */
const fetchNewsByCompanyIDPaged = async (
    companyId: number,
    opts: FetchNewsOptions = {}
): Promise<{ success: true; data: NewsEntry[]; page: NewsPageInfo } | { success: false; error: string }> => {
    try {
        const params: Record<string, any> = {
            cid: companyId,
            limit: typeof opts.limit === "number" ? opts.limit : 24,
        };

        if (opts.title?.trim()) params.title = opts.title.trim();
        if (opts.from) params.from = opts.from;
        if (opts.to) params.to = opts.to;
        if (opts.domainTag && opts.domainTag !== "ALL") params.domain_tag = opts.domainTag;
        if (opts.subdomainTag && opts.subdomainTag !== "ALL") params.subdomain_tag = opts.subdomainTag;
        if (opts.cursor?.cursor_id) params.cursor_id = opts.cursor.cursor_id;
        if (opts.cursor?.cursor_ts) params.cursor_ts = opts.cursor.cursor_ts;

        const res = await api.get("/api/news", {
            params,
            headers: authHeader(ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY),
            signal: opts.signal as any, // axios v1 supports AbortController; cast is fine for TS here
        });

        if (!res.data?.success) {
            const msg = res.data?.error || "Failed to load news";
            toast.error(msg);
            return { success: false, error: msg };
        }

        const payload = res.data ?? {};
        const rows: any[] = Array.isArray(payload.data) ? payload.data : [];
        const page: NewsPageInfo = {
            has_more: Boolean(payload?.page?.has_more),
            next_cursor: payload?.page?.next_cursor ?? null,
        };

        const transformed: NewsEntry[] = rows.map((news: any) => {
            // Companies mapped to simple arrays for easy chip rendering
            const companiesArr: any[] = Array.isArray(news?.companies) ? news.companies : [];
            const company_names: string[] = companiesArr
                .map(
                    (c) =>
                        c?.company?.company_full ||
                        c?.company?.company_name ||
                        c?.company_full ||
                        c?.company_name ||
                        c?.name ||
                        ""
                )
                .filter(Boolean);
            const company_ids: number[] = companiesArr
                .map((c) => c?.company?.id)
                .filter((x: any) => typeof x === "number");

            return {
                title: news?.title,
                content: news?.content,
                created_at: new Date(news?.created_at),
                image_url: news?.image_url,
                source_link: news?.link_to_source,
                domains: (news?.domains ?? []).map((d: any) => d?.domain),
                news_tag: news?.news_tag,
                subdomain_tag: news?.subdomain_tag,
                // extra helpful fields (your UI can ignore if not needed)
                company_names,
                company_ids,
                companies: companiesArr,
            } as any; // keep relaxed to avoid strict coupling with NewsEntry shape
        });

        return { success: true, data: transformed, page };
    } catch (err: any) {
        const msg = errText(err, "Failed to load news");
        toast.error(msg);
        return { success: false, error: msg };
    }
};

/**
 * Backward-compatible helper that returns the *first page only* (no pagination),
 * so existing callers don’t need to change. If you need virtualization, switch
 * to `fetchNewsByCompanyIDPaged`.
 */
const fetchNewsByCompanyID = async (companyId: number) => {
    const first = await fetchNewsByCompanyIDPaged(companyId, { limit: 24 });
    if (!first.success) return first;
    return { success: true, data: first.data };
};

export {
    fetchCompanyListWithPermission,
    fetchCompanyInfo,
    fetchJDByCompanyID,
    fetchVideosByCompanyID,
    fetchNewsByCompanyID,
    fetchNewsByCompanyIDPaged,
};
