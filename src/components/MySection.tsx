import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { ArrowPathIcon, ArrowTopRightOnSquareIcon, FunnelIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { getNewsForCompanies, getShortlistsBySession } from "@/lib/api/my_section";
import { onRouteTo } from "@/utils/urlClick";
import { SmartImage } from "@/components/SmartImage";

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
const NEWS_PAGE_SIZE = 12;

// Dark-theme domain chip styles (bg includes a border to avoid changing usage)
const DOMAIN_COLORS: Record<string, { bg: string; text: string }> = {
    FINANCE: { bg: "bg-[#05241b] border border-emerald-700/30", text: "text-emerald-300" },
    MARKETING: { bg: "bg-[#2b0a12] border border-rose-700/30", text: "text-rose-300" },
    CONSULTING: { bg: "bg-[#061b26] border border-sky-700/30", text: "text-sky-300" },
    PRODMAN: { bg: "bg-[#1c1236] border border-violet-700/30", text: "text-violet-300" },
    OPERATIONS: { bg: "bg-[#251a06] border border-amber-700/30", text: "text-amber-300" },
    GENMAN: { bg: "bg-[#072420] border border-teal-700/30", text: "text-teal-300" },
};

function keyForNews(n: NewsEntry, i: number) {
    return `${n.title ?? ""}|${n.link_to_source ?? ""}|${n.created_at ?? ""}|${i}`;
}

export default function MySection() {
    const router = useRouter();

    const [shortlists, setShortlists] = useState<Shortlist[]>([]);
    const [news, setNews] = useState<NewsEntry[]>([]);
    const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);

    const [loadingShortlists, setLoadingShortlists] = useState(true);
    const [loadingNews, setLoadingNews] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [slError, setSlError] = useState<string | null>(null);
    const [newsError, setNewsError] = useState<string | null>(null);

    const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
    const [searchCompany, setSearchCompany] = useState("");

    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const mountedRef = useRef(true);
    const slAbortRef = useRef<AbortController | null>(null);
    const newsAbortRef = useRef<AbortController | null>(null);
    const newsCacheRef = useRef<Map<string, NewsEntry[]>>(new Map());

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            slAbortRef.current?.abort();
            newsAbortRef.current?.abort();
        };
    }, []);

    const stableCompanyIds = useMemo(() => {
        const ids = shortlists.map((s) => s.company_id).filter(Boolean);
        return Array.from(new Set(ids)).sort((a, b) => a - b);
    }, [shortlists]);

    const newsKey = useMemo(() => (stableCompanyIds.length ? JSON.stringify(stableCompanyIds) : ""), [stableCompanyIds]);

    const fetchShortlists = useCallback(async (): Promise<Shortlist[] | null> => {
        slAbortRef.current?.abort();
        const ac = new AbortController();
        slAbortRef.current = ac;

        try {
            setLoadingShortlists(true);
            setSlError(null);
            const res = await getShortlistsBySession(SHORTLIST_MAX_COUNT);
            if (!mountedRef.current) return null;
            const list = Array.isArray(res) ? res : [];
            setShortlists(list);
            if (selectedCompanyId && !list.some((s) => s.company_id === selectedCompanyId)) {
                setSelectedCompanyId(null);
            }
            return list;
        } catch (e: any) {
            if (e?.name !== "AbortError" && mountedRef.current) {
                setShortlists([]);
                setSlError("Failed to load shortlists.");
                toast.error("Couldn't load shortlists");
            }
            return null;
        } finally {
            if (mountedRef.current) setLoadingShortlists(false);
        }
    }, [selectedCompanyId]);

    const fetchNews = useCallback(
        async (companyIds: number[]): Promise<NewsEntry[] | null> => {
            if (!companyIds.length) {
                setNews([]);
                setLoadingNews(false);
                setNewsError(null);
                return [];
            }
            const key = JSON.stringify(companyIds);
            if (newsCacheRef.current.has(key)) {
                const cached = newsCacheRef.current.get(key)!;
                setNews(cached);
                setLoadingNews(false);
                setNewsError(null);
                return cached;
            }

            newsAbortRef.current?.abort();
            const ac = new AbortController();
            newsAbortRef.current = ac;

            try {
                setLoadingNews(true);
                setNewsError(null);

                const params = new URLSearchParams();
                companyIds.forEach((id) => params.append("cid", String(id)));

                const res = await getNewsForCompanies(params.toString());
                if (!mountedRef.current) return null;

                const list = (Array.isArray(res) ? res : []).sort((a, b) => {
                    const da = new Date(a.created_at ?? 0).getTime();
                    const db = new Date(b.created_at ?? 0).getTime();
                    return db - da;
                });

                newsCacheRef.current.set(key, list);
                setNews(list);
                setVisibleCount(NEWS_PAGE_SIZE);
                return list;
            } catch (e: any) {
                if (e?.name !== "AbortError" && mountedRef.current) {
                    setNews([]);
                    setNewsError("Failed to load news.");
                    toast.error("Couldn't load news");
                }
                return null;
            } finally {
                if (mountedRef.current) setLoadingNews(false);
            }
        },
        []
    );

    const loadAll = useCallback(async () => {
        setRefreshing(true);
        setExpanded(new Set());
        const sl = await fetchShortlists();
        if (sl && sl.length) {
            const ids = Array.from(new Set(sl.map((s) => s.company_id))).sort((a, b) => a - b);
            await fetchNews(ids);
        } else {
            setNews([]);
            setLoadingNews(false);
            setNewsError(null);
        }
        setRefreshing(false);
    }, [fetchShortlists, fetchNews]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const companyOptions = useMemo(() => {
        const map = new Map<number, string>();
        shortlists.forEach((s) => {
            const name = s.company?.company_full || s.company?.company_name || `#${s.company_id}`;
            map.set(s.company_id, name);
        });
        const options = Array.from(map.entries()).map(([value, label]) => ({ value, label }));
        return options
            .filter((o) => (searchCompany ? o.label.toLowerCase().includes(searchCompany.toLowerCase()) : true))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [shortlists, searchCompany]);

    const filteredNews = useMemo(() => {
        const base = selectedCompanyId ? news.filter((n) => n.company_ids.includes(selectedCompanyId)) : news;
        return base.slice(0, visibleCount);
    }, [news, selectedCompanyId, visibleCount]);

    const hasMoreNews = useMemo(() => {
        const total = selectedCompanyId ? news.filter((n) => n.company_ids.includes(selectedCompanyId)).length : news.length;
        return visibleCount < total;
    }, [news, selectedCompanyId, visibleCount]);

    const onCompanyClick = useCallback(
        async (company_id: number) => {
            await onRouteTo(router, "COMPANY", company_id);
        },
        [router]
    );

    const easeOutCB = [0.2, 0.8, 0.2, 1] as const;

    return (
        <MotionConfig transition={{ duration: 0.18, ease: easeOutCB }} reducedMotion="user">
            <div className="flex flex-col gap-4 p-3 sm:p-4 w-full max-w-full h-[calc(100vh-5rem)] bg-gradient-to-br from-[#050b10] via-[#07131a] to-[#041019]">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-xl sm:text-2xl font-bold text-cyan-100">My Section</h2>
                    <button
                        onClick={loadAll}
                        disabled={refreshing}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition ${refreshing ? "border-cyan-700/60 text-cyan-300 bg-[#0b1f2b]" : "border-cyan-700/50 text-cyan-100 bg-[#0a1820] hover:border-cyan-400/60"
                            }`}
                        title="Refresh all"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 h-full overflow-hidden">
                    {/* Shortlists panel */}
                    <motion.section
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.22 }}
                        className="lg:col-span-5 h-full overflow-hidden"
                    >
                        <div className="flex flex-col h-full rounded-2xl border border-cyan-700/40 bg-[#081219]/85 backdrop-blur">
                            <div className="p-3 sm:p-4 border-b border-cyan-700/40">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-base sm:text-lg font-semibold text-cyan-100">Shortlists</h3>
                                    <div className="text-[11px] sm:text-xs text-cyan-300/90">{shortlists.length}</div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            value={searchCompany}
                                            onChange={(e) => setSearchCompany(e.target.value)}
                                            placeholder="Search companies…"
                                            className="w-full px-3 py-2 rounded-xl bg-[#0a1820] border border-cyan-700/50 text-cyan-100 placeholder:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                        />
                                    </div>
                                    {selectedCompanyId && (
                                        <button
                                            onClick={() => setSelectedCompanyId(null)}
                                            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-cyan-700/50 text-cyan-100 bg-[#0a1820] hover:border-cyan-400/50"
                                            title="Clear filter"
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                            Clear
                                        </button>
                                    )}
                                </div>

                                {slError && (
                                    <div className="mt-2 text-xs text-rose-300 bg-rose-900/10 border border-rose-700/30 rounded px-2 py-1">
                                        {slError}
                                    </div>
                                )}
                            </div>

                            <div className="p-3 overflow-y-auto flex-1 space-y-2">
                                <AnimatePresence mode="popLayout">
                                    {loadingShortlists ? (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                                            {[...Array(4)].map((_, i) => (
                                                <div key={i} className="h-16 rounded-xl bg-[#0a1820] border border-cyan-700/40 animate-pulse" />
                                            ))}
                                        </motion.div>
                                    ) : shortlists.length === 0 ? (
                                        <div className="text-cyan-300/80 text-sm">No shortlists yet.</div>
                                    ) : (
                                        <>
                                            {/* Quick filter chips */}
                                            {companyOptions.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-cyan-300">
                                                        <FunnelIcon className="w-4 h-4" />
                                                        Filter
                                                    </span>
                                                    {companyOptions.slice(0, 12).map((opt) => {
                                                        const active = selectedCompanyId === opt.value;
                                                        return (
                                                            <button
                                                                key={opt.value}
                                                                onClick={() => setSelectedCompanyId(active ? null : opt.value)}
                                                                className={`text-[11px] px-2 py-1 rounded-full border transition ${active
                                                                        ? "bg-cyan-600 text-[#081219] border-cyan-500"
                                                                        : "bg-[#0a1820] text-cyan-100 border-cyan-700/50 hover:border-cyan-400/50"
                                                                    }`}
                                                                title={opt.label}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {shortlists.map((s) => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => onCompanyClick(s.company_id)}
                                                    className="w-full text-left border border-cyan-700/40 bg-gradient-to-br from-[#0a1820] to-[#0c1f29] p-3 sm:p-4 rounded-xl hover:border-cyan-400/60 transition transform-gpu will-change-transform"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-cyan-100 font-semibold leading-snug">
                                                            {s.company?.company_full ?? s.company?.company_name}
                                                        </h4>
                                                        <span className="text-[11px] text-cyan-300">{s.round_details}</span>
                                                    </div>
                                                    <div className="text-sm text-cyan-100/90 mt-0.5">
                                                        <strong>Role:</strong> {s.role}
                                                    </div>
                                                </button>
                                            ))}
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.section>

                    {/* News panel */}
                    <motion.section
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.22 }}
                        className="lg:col-span-7 h-full overflow-hidden"
                    >
                        <div className="flex flex-col h-full rounded-2xl border border-cyan-700/40 bg-[#081219]/85 backdrop-blur">
                            <div className="p-3 sm:p-4 border-b border-cyan-700/40">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-base sm:text-lg font-semibold text-cyan-100">Related News</h3>
                                    <div className="text-[11px] sm:text-xs text-cyan-300/90">
                                        {selectedCompanyId ? "Filtered" : "All"} • {filteredNews.length}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="relative">
                                        <select
                                            value={selectedCompanyId ?? ""}
                                            onChange={(e) => setSelectedCompanyId(e.target.value ? Number(e.target.value) : null)}
                                            className="px-3 py-1.5 text-xs rounded-full bg-[#0a1820] text-cyan-100 border border-cyan-700/50 hover:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                            title="Filter by company"
                                        >
                                            <option value="">All Companies</option>
                                            {companyOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <button
                                        onClick={() => setVisibleCount((c) => c + NEWS_PAGE_SIZE)}
                                        disabled={!hasMoreNews || loadingNews}
                                        className={`text-xs px-3 py-1.5 rounded-full border transition ${hasMoreNews && !loadingNews
                                                ? "text-cyan-100 bg-[#0a1820] border-cyan-700/50 hover:border-cyan-400/60"
                                                : "text-cyan-400/60 bg-[#0a1820] border-cyan-800/50 cursor-not-allowed"
                                            }`}
                                    >
                                        Load more
                                    </button>
                                </div>

                                {newsError && (
                                    <div className="mt-2 text-xs text-rose-300 bg-rose-900/10 border border-rose-700/30 rounded px-2 py-1">
                                        {newsError}
                                    </div>
                                )}
                            </div>

                            <div className="p-3 sm:p-4 overflow-y-auto flex-1">
                                <AnimatePresence mode="wait">
                                    {loadingNews ? (
                                        <motion.div key="news-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                            <div className="space-y-4">
                                                {[...Array(4)].map((_, i) => (
                                                    <div key={i} className="h-28 rounded-2xl bg-[#0a1820] border border-cyan-700/40 animate-pulse" />
                                                ))}
                                            </div>
                                        </motion.div>
                                    ) : filteredNews.length === 0 ? (
                                        <motion.div key="news-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                            <div className="flex flex-col items-center justify-center text-center text-cyan-300 p-8 rounded-2xl border border-cyan-700/40 bg-gradient-to-b from-[#0b1f29] to-[#0a1820]">
                                                <div className="w-14 h-14 flex items-center justify-center rounded-full bg-[#0a2230] border border-cyan-800/40 mb-3">
                                                    <svg className="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                                                    </svg>
                                                </div>
                                                <p className="text-base font-semibold text-cyan-100">No news entries</p>
                                                <p className="text-sm text-cyan-300/70 mt-1">Try another company or refresh.</p>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        // ===== Masonry layout (CSS multi-columns) =====
                                        <motion.div
                                            key={`news-${newsKey}-${selectedCompanyId ?? "all"}-${visibleCount}`}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="columns-1 md:columns-2 gap-5 [column-fill:_balance]"
                                        >
                                            {filteredNews.map((entry, idx) => {
                                                const k = keyForNews(entry, idx);
                                                const isOpen = expanded.has(k);
                                                return (
                                                    <motion.article
                                                        key={k}
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="group relative mb-5 flex gap-3 rounded-2xl border border-cyan-700/40 bg-gradient-to-br from-[#0a1820] to-[#0e1e2b] p-3 hover:border-cyan-400/60 transform-gpu will-change-transform break-inside-avoid print:break-inside-avoid-page"
                                                        style={{
                                                            breakInside: "avoid",
                                                            pageBreakInside: "avoid",
                                                            ...({ WebkitColumnBreakInside: "avoid" } as any),
                                                        }}
                                                    >
                                                        <div className="w-28 h-28 min-w-[7rem] rounded-xl overflow-hidden bg-[#0a2230] ring-1 ring-white/5 flex items-center justify-center">
                                                            <SmartImage
                                                                companyId={(selectedCompanyId ?? entry.company_ids?.[0]) as number}
                                                                src={entry.image_url}
                                                                alt={entry.title}
                                                                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                                            />
                                                        </div>

                                                        <div className="flex-1 flex flex-col min-w-0">
                                                            <h4 className="text-cyan-100 font-semibold leading-snug line-clamp-2">{entry.title}</h4>

                                                            <div className="flex flex-wrap gap-1.5 my-2">
                                                                {entry.domains?.map((d, i) => {
                                                                    const c = DOMAIN_COLORS[d.toUpperCase()] ?? {
                                                                        bg: "bg-[#0b1820] border border-cyan-900/40",
                                                                        text: "text-cyan-200",
                                                                    };
                                                                    return (
                                                                        <span
                                                                            key={`${d}-${i}`}
                                                                            className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${c.bg} ${c.text}`}
                                                                        >
                                                                            {d}
                                                                        </span>
                                                                    );
                                                                })}
                                                                {entry.subdomain_tag && (
                                                                    <span className="px-2 py-0.5 text-[10px] rounded-full border border-cyan-500/60 text-cyan-300 bg-cyan-500/10">
                                                                        {entry.subdomain_tag}
                                                                    </span>
                                                                )}
                                                                {entry.news_tag && (
                                                                    <span className="px-2 py-0.5 text-[10px] rounded-full border border-purple-500/50 text-purple-300 bg-purple-500/10">
                                                                        {entry.news_tag}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <p className={`text-sm text-cyan-100/90 ${isOpen ? "" : "line-clamp-3"}`}>{entry.content}</p>

                                                            <div className="mt-2 flex items-center justify-between text-[11px] text-cyan-300/80 pt-2 border-t border-cyan-800/50">
                                                                <span>
                                                                    {entry.created_at
                                                                        ? new Date(entry.created_at).toLocaleDateString(undefined, {
                                                                            year: "numeric",
                                                                            month: "short",
                                                                            day: "numeric",
                                                                        })
                                                                        : "Unknown"}
                                                                </span>
                                                                <div className="flex items-center gap-3">
                                                                    {entry.content && entry.content.length > 120 && (
                                                                        <button
                                                                            onClick={() =>
                                                                                setExpanded((prev) => {
                                                                                    const n = new Set(prev);
                                                                                    n.has(k) ? n.delete(k) : n.add(k);
                                                                                    return n;
                                                                                })
                                                                            }
                                                                            className="text-cyan-400 hover:underline"
                                                                        >
                                                                            {isOpen ? "Show less" : "Read more"}
                                                                        </button>
                                                                    )}
                                                                    {entry.link_to_source && (
                                                                        <a
                                                                            href={entry.link_to_source}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center"
                                                                            title="Open source"
                                                                        >
                                                                            <ArrowTopRightOnSquareIcon className="w-4 h-4 text-cyan-400 opacity-80 group-hover:opacity-100" />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.article>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {!loadingNews && hasMoreNews && (
                                    <div className="flex justify-center mt-4">
                                        <button
                                            onClick={() => setVisibleCount((c) => c + NEWS_PAGE_SIZE)}
                                            className="px-4 py-2 text-sm rounded-full border border-cyan-700/50 bg-[#0a1820] text-cyan-100 hover:border-cyan-400/60"
                                        >
                                            Load more
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.section>
                </div>
            </div>
        </MotionConfig>
    );
}
