"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowPathIcon,
    ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/solid";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { getNewsForCompanies, getShortlistsBySession } from "@/lib/api/my_section";
import { onRouteTo } from "@/utils/urlClick";

/* --------------------------- Types & constants --------------------------- */

const DOMAIN_COLORS: Record<string, { bg: string; text: string }> = {
    FINANCE: { bg: "bg-green-100", text: "text-green-800" },
    MARKETING: { bg: "bg-yellow-100", text: "text-yellow-800" },
    CONSULTING: { bg: "bg-blue-100", text: "text-blue-800" },
    PRODMAN: { bg: "bg-indigo-100", text: "text-indigo-800" },
    OPERATIONS: { bg: "bg-pink-100", text: "text-pink-800" },
    GENMAN: { bg: "bg-purple-100", text: "text-purple-800" },
};

type Shortlist = {
    id: number;
    company: { company_name: string; company_full: string };
    company_id: number;
    role: string;
    round_details: string;
};

export type NewsEntry = {
    title: string;
    link_to_source: string;
    content: string;
    company_ids: number[];
    image_url: string;
    domains?: string[];
    subdomain_tag?: string;
    news_tag?: string;
    created_at?: Date | string;
};

const SHORTLIST_MAX_COUNT = 20;

/* --------------------------- Small UI helpers --------------------------- */

const PanelTitle: React.FC<{ title: string; right?: React.ReactNode }> = ({
    title,
    right,
}) => (
    <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-semibold text-cyan-300">{title}</h3>
        {right}
    </div>
);

const ShortlistsSkeleton = () => (
    <div className="space-y-3">
        {[...Array(3)].map((_, idx) => (
            <div
                key={idx}
                className="h-16 rounded-lg bg-[#0f2030] border border-cyan-900/40 animate-pulse"
            />
        ))}
    </div>
);

const NewsSkeleton = () => (
    <div className="space-y-4">
        {[...Array(4)].map((_, idx) => (
            <div
                key={idx}
                className="h-28 rounded-xl bg-[#0a161f] border border-cyan-900/40 animate-pulse"
            />
        ))}
    </div>
);

export default function MySection() {
    const router = useRouter();

    const [shortlists, setShortlists] = useState<Shortlist[]>([]);
    const [news, setNews] = useState<NewsEntry[]>([]);

    const [loadingShortlists, setLoadingShortlists] = useState(true);
    const [loadingNews, setLoadingNews] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());

    const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

    // avoid setting state after unmount
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // prevent stale-news race: only the latest request can set state
    const latestNewsReqRef = useRef(0);

    const toggleExpanded = useCallback((idx: number) => {
        setExpandedIndices((prev) => {
            const updated = new Set(prev);
            updated.has(idx) ? updated.delete(idx) : updated.add(idx);
            return updated;
        });
    }, []);

    const onCompanySelected = useCallback(
        async (company_id: number) => {
            onRouteTo(router, "COMPANY", company_id);
        },
        [router]
    );

    /* ------------------------------- Fetching ------------------------------- */

    const fetchShortlists = useCallback(async (): Promise<Shortlist[] | null> => {
        try {
            setLoadingShortlists(true);
            const res = await getShortlistsBySession(SHORTLIST_MAX_COUNT);
            if (!mountedRef.current) return null;
            setShortlists(res ?? []);
            return res ?? [];
        } catch (e) {
            if (mountedRef.current) {
                setShortlists([]);
                toast.error("Failed to load shortlists");
            }
            return null;
        } finally {
            if (mountedRef.current) setLoadingShortlists(false);
        }
    }, []);

    // De-duped, stable list of shortlist company IDs
    const shortlistCompanyIds = useMemo(() => {
        const ids = shortlists.map((s) => s.company_id).filter(Boolean);
        const unique = Array.from(new Set(ids));
        unique.sort((a, b) => a - b);
        return unique;
    }, [shortlists]);

    // stable key for effect dependency (prevents multiple identical fetches)
    const companyIdsKey = useMemo(
        () => (shortlistCompanyIds.length ? JSON.stringify(shortlistCompanyIds) : ""),
        [shortlistCompanyIds]
    );

    //fetch news only when the shortlist IDs actually change
    useEffect(() => {
        // initial: if no companies, clear and stop
        if (!companyIdsKey) {
            setNews([]);
            setLoadingNews(false);
            return;
        }

        const ids: number[] = JSON.parse(companyIdsKey);
        const params = new URLSearchParams();
        ids.forEach((id) => params.append("cid", id.toString()));

        let cancelled = false;
        setLoadingNews(true);
        latestNewsReqRef.current += 1;
        const reqId = latestNewsReqRef.current;

        (async () => {
            try {
                const res = await getNewsForCompanies(params.toString());
                if (!mountedRef.current || cancelled) return;
                // accept only the latest request
                if (reqId === latestNewsReqRef.current) {
                    setNews(res ?? []);
                }
            } catch (e) {
                if (mountedRef.current && reqId === latestNewsReqRef.current) {
                    setNews([]);
                    toast.error("Failed to load news");
                }
            } finally {
                if (mountedRef.current && reqId === latestNewsReqRef.current) {
                    setLoadingNews(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [companyIdsKey]);

    // Initial load: only fetch shortlists; news will follow via effect above
    useEffect(() => {
        (async () => {
            await fetchShortlists();
        })();
    }, [fetchShortlists]);

    // Refresh shortlists; news will refetch automatically if IDs change
    const handleRefreshShortlists = useCallback(async () => {
        setRefreshing(true);
        await fetchShortlists();
        setRefreshing(false);
    }, [fetchShortlists]);

    /* --------------------------------- Memos -------------------------------- */

    // Company options for filter (from shortlists)
    const companyOptions = useMemo(() => {
        const map = new Map<number, string>();
        shortlists.forEach((s) => {
            const name = s.company?.company_full || s.company?.company_name || `#${s.company_id}`;
            map.set(s.company_id, name);
        });
        // sort alphabetically by name
        return Array.from(map.entries())
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [shortlists]);

    // Filtered news (client-side) based on selected company
    const filteredNews = useMemo(() => {
        if (!selectedCompanyId) return news;
        return news.filter((n) => n.company_ids.includes(selectedCompanyId));
    }, [news, selectedCompanyId]);

    const noNewsContent = useMemo(
        () => (
            <div className="flex flex-col items-center justify-center text-center text-cyan-300 p-8 rounded-xl border border-cyan-900/40 bg-gradient-to-b from-[#0d1b24] to-[#0a141d] shadow-[0_0_20px_rgba(0,255,255,0.08)]">
                <div className="w-14 h-14 flex items-center justify-center rounded-full bg-[#102231] border border-cyan-900/50 mb-3">
                    <svg className="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </div>
                <p className="text-base font-semibold text-cyan-100">No news entries available</p>
                <p className="text-sm text-cyan-300/70 mt-1">Please check back later.</p>
            </div>
        ),
        []
    );

    /* --------------------------------- Render -------------------------------- */

    return (
        <div className="flex flex-col lg:flex-row gap-6 p-4 sm:p-6 w-full max-w-full h-[calc(100vh-5rem)]">
            {/* --------------------------- Left: Shortlists --------------------------- */}
            <motion.div
                className="lg:w-5/12 w-full md:w-1/2 flex-grow overflow-y-auto pr-1 sm:pr-2 scrollbar-thin scrollbar-thumb-cyan-500/40"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.35 }}
            >
                <div className="bg-[#0b1721] rounded-lg p-4 shadow-md border border-cyan-900/40">
                    <PanelTitle
                        title="My Shortlists"
                        right={
                            <button
                                onClick={handleRefreshShortlists}
                                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-md border transition ${refreshing
                                        ? "border-cyan-700 text-cyan-300 bg-[#0d1f2b]"
                                        : "border-cyan-800 text-cyan-200 hover:bg-[#0f2130] active:scale-95"
                                    }`}
                                disabled={refreshing}
                                aria-label="Refresh shortlists and news"
                            >
                                <ArrowPathIcon className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                                Refresh
                            </button>
                        }
                    />

                    {/* Loading / Empty / List */}
                    <AnimatePresence mode="wait">
                        {loadingShortlists ? (
                            <motion.div
                                key="sl-loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <ShortlistsSkeleton />
                            </motion.div>
                        ) : shortlists.length === 0 ? (
                            <motion.p
                                key="sl-empty"
                                className="text-cyan-200/80 italic"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                No shortlists found.
                            </motion.p>
                        ) : (
                            <motion.div
                                key="sl-list"
                                className="space-y-3"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                {shortlists.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => onCompanySelected(s.company_id)}
                                        className="w-full text-left border border-cyan-900/50 bg-[#0e1c27] p-4 rounded-lg shadow-sm hover:bg-[#112433] hover:shadow transition duration-200 cursor-pointer active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
                                    >
                                        <h4 className="text-lg font-semibold text-cyan-200">
                                            {s.company?.company_full ?? s.company?.company_name}
                                        </h4>
                                        <p className="text-cyan-100/90 text-sm">
                                            <strong>Role:</strong> {s.role}
                                        </p>
                                        <p className="text-cyan-100/90 text-sm">
                                            <strong>Round:</strong> {s.round_details}
                                        </p>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* ----------------------------- Right: News ----------------------------- */}
            <motion.div
                className="flex-grow w-full overflow-y-auto pr-1 sm:pr-2 scrollbar-thin scrollbar-thumb-cyan-500/40"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.35 }}
            >
                <div className="group h-full w-full">
                    {/* Controls row (company filter) */}
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-cyan-300">Related News</h3>
                        <div className="flex items-center gap-2">
                            <label htmlFor="companyFilter" className="text-xs text-cyan-300/80">
                                Company
                            </label>
                            <select
                                id="companyFilter"
                                value={selectedCompanyId ?? ""}
                                onChange={(e) =>
                                    setSelectedCompanyId(e.target.value === "" ? null : Number(e.target.value))
                                }
                                className="bg-[#0e1c27] text-cyan-200 text-xs px-2 py-1 rounded-md border border-cyan-900/50 hover:border-cyan-700/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition"
                                title="Filter news by shortlist company"
                            >
                                <option value="">All companies</option>
                                {companyOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {loadingNews ? (
                            <motion.div
                                key="news-loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <NewsSkeleton />
                            </motion.div>
                        ) : !filteredNews?.length ? (
                            <motion.div key="news-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                {noNewsContent}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="news-list"
                                className="grid grid-cols-1 gap-6 w-full"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                {filteredNews.map((entry, idx) => {
                                    const isExpanded = expandedIndices.has(idx);
                                    return (
                                        <motion.div
                                            key={`${entry.company_ids.join(",")}-${idx}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.25, delay: idx * 0.03 }}
                                            className="group relative flex flex-row rounded-xl border border-cyan-900/40 bg-gradient-to-br from-[#0a161f] to-[#0e1e2b] hover:shadow-[0_0_32px_rgba(0,255,255,0.18)] transition-all duration-300 p-4 overflow-hidden hover:-translate-y-0.5"
                                        >
                                            {/* Image */}
                                            <div className="w-32 h-32 min-w-[8rem] rounded-lg overflow-hidden bg-black/30 flex items-center justify-center">
                                                {entry.image_url ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={entry.image_url}
                                                        alt={entry.title}
                                                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                                                    />
                                                ) : (
                                                    <div className="text-xs text-gray-400">No Image</div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 flex flex-col ml-4">
                                                <h3 className="text-lg font-semibold text-cyan-100 leading-snug mb-1">
                                                    {entry.title}
                                                </h3>

                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {entry.domains?.map((domain, i) => {
                                                        const color =
                                                            DOMAIN_COLORS[domain.toUpperCase()] ?? {
                                                                bg: "bg-gray-800",
                                                                text: "text-gray-300",
                                                            };
                                                        return (
                                                            <span
                                                                key={`${domain}-${i}`}
                                                                className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${color.bg} ${color.text}`}
                                                            >
                                                                {domain}
                                                            </span>
                                                        );
                                                    })}
                                                    {entry.subdomain_tag && (
                                                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full border border-cyan-500/60 text-cyan-300 bg-cyan-500/10">
                                                            {entry.subdomain_tag}
                                                        </span>
                                                    )}
                                                    {entry.news_tag && (
                                                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full border border-purple-400/60 text-purple-300 bg-purple-500/10">
                                                            {entry.news_tag}
                                                        </span>
                                                    )}
                                                </div>

                                                <p
                                                    className={`text-sm text-gray-300 mb-2 ${isExpanded ? "" : "line-clamp-3"
                                                        }`}
                                                >
                                                    {entry.content}
                                                </p>

                                                {entry.content && entry.content.length > 120 && (
                                                    <div className="flex justify-end">
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                toggleExpanded(idx);
                                                            }}
                                                            className="text-xs text-cyan-400 font-medium hover:underline"
                                                        >
                                                            {isExpanded ? "Show Less" : "Read More"}
                                                        </button>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between text-[11px] text-gray-400 mt-auto pt-2 border-t border-gray-700/50">
                                                    <span>
                                                        {entry.created_at
                                                            ? new Date(entry.created_at).toLocaleDateString(undefined, {
                                                                year: "numeric",
                                                                month: "short",
                                                                day: "numeric",
                                                            })
                                                            : "Unknown"}
                                                    </span>
                                                    {entry.link_to_source && (
                                                        <a
                                                            href={entry.link_to_source}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center"
                                                        >
                                                            <ArrowTopRightOnSquareIcon className="w-4 h-4 text-cyan-400 opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
