import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowPathIcon, ArrowTopRightOnSquareIcon, FunnelIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { getNewsForCompanies, getShortlistsBySession } from "@/lib/api/my_section";
import { onRouteTo } from "@/utils/urlClick";

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

const DOMAIN_COLORS: Record<string, { bg: string; text: string }> = {
    FINANCE: { bg: "bg-green-100", text: "text-green-800" },
    MARKETING: { bg: "bg-yellow-100", text: "text-yellow-800" },
    CONSULTING: { bg: "bg-blue-100", text: "text-blue-800" },
    PRODMAN: { bg: "bg-indigo-100", text: "text-indigo-800" },
    OPERATIONS: { bg: "bg-pink-100", text: "text-pink-800" },
    GENMAN: { bg: "bg-purple-100", text: "text-purple-800" },
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

    const newsKey = useMemo(
        () => (stableCompanyIds.length ? JSON.stringify(stableCompanyIds) : ""),
        [stableCompanyIds]
    );

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

    return (
        <div className="flex flex-col gap-5 p-4 sm:p-6 w-full max-w-full h-[calc(100vh-5rem)]">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-cyan-100">My Section</h2>
                </div>
                <button
                    onClick={loadAll}
                    disabled={refreshing}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border transition ${refreshing
                            ? "border-cyan-700 text-cyan-300 bg-[#0d1f2b]"
                            : "border-cyan-800 text-cyan-200 bg-[#0b1721] hover:bg-[#0d1f2b]"
                        }`}
                >
                    <ArrowPathIcon className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh All
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
                {/* Shortlists panel */}
                <motion.section
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25 }}
                    className="lg:col-span-5 h-full overflow-hidden"
                >
                    <div className="flex flex-col h-full rounded-xl border border-cyan-900/40 bg-[#0b1721]">
                        <div className="p-4 border-b border-cyan-900/40">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold text-cyan-200">Shortlists</h3>
                                <div className="text-xs text-cyan-400">{shortlists.length}</div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input
                                        value={searchCompany}
                                        onChange={(e) => setSearchCompany(e.target.value)}
                                        placeholder="Search companies…"
                                        className="w-full px-3 py-2 rounded-lg bg-[#0e1c27] border border-cyan-900/50 text-cyan-100 placeholder:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-600/70"
                                    />
                                </div>
                                {selectedCompanyId && (
                                    <button
                                        onClick={() => setSelectedCompanyId(null)}
                                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-cyan-900/50 text-cyan-200 bg-[#0e1c27] hover:bg-[#112433]"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                        Clear
                                    </button>
                                )}
                            </div>

                            {slError && (
                                <div className="mt-3 text-xs text-red-300 bg-red-900/20 border border-red-800/40 rounded px-2 py-1">
                                    {slError}
                                </div>
                            )}
                        </div>

                        <div className="p-3 overflow-y-auto flex-1 space-y-2">
                            <AnimatePresence mode="popLayout">
                                {loadingShortlists ? (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                                        {[...Array(4)].map((_, i) => (
                                            <div key={i} className="h-16 rounded-lg bg-[#0f2030] border border-cyan-900/40 animate-pulse" />
                                        ))}
                                    </motion.div>
                                ) : shortlists.length === 0 ? (
                                    <div className="text-cyan-300/80 text-sm">No shortlists yet.</div>
                                ) : (
                                    <>
                                        {/* Quick filter chips */}
                                        {companyOptions.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                <span className="inline-flex items-center gap-1 text-xs text-cyan-300">
                                                    <FunnelIcon className="w-4 h-4" />
                                                    Filter
                                                </span>
                                                {companyOptions.slice(0, 12).map((opt) => {
                                                    const active = selectedCompanyId === opt.value;
                                                    return (
                                                        <button
                                                            key={opt.value}
                                                            onClick={() => setSelectedCompanyId(active ? null : opt.value)}
                                                            className={`text-[11px] px-2 py-1 rounded-full border ${active
                                                                    ? "bg-cyan-600 text-[#0b1721] border-cyan-500"
                                                                    : "bg-[#0e1c27] text-cyan-200 border-cyan-900/50 hover:bg-[#112433]"
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
                                                className="w-full text-left border border-cyan-900/50 bg-[#0e1c27] p-4 rounded-lg hover:bg-[#112433] transition"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-cyan-200 font-semibold">
                                                        {s.company?.company_full ?? s.company?.company_name}
                                                    </h4>
                                                    <span className="text-[11px] text-cyan-400">{s.round_details}</span>
                                                </div>
                                                <div className="text-sm text-cyan-100/90">
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
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25 }}
                    className="lg:col-span-7 h-full overflow-hidden"
                >
                    <div className="flex flex-col h-full rounded-xl border border-cyan-900/40 bg-[#0b1721]">
                        <div className="p-4 border-b border-cyan-900/40">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold text-cyan-200">Related News</h3>
                                <div className="text-xs text-cyan-400">
                                    {selectedCompanyId ? "Filtered" : "All"} • {filteredNews.length}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedCompanyId ?? ""}
                                    onChange={(e) => setSelectedCompanyId(e.target.value ? Number(e.target.value) : null)}
                                    className="px-2 py-1 text-xs rounded-md bg-[#0e1c27] text-cyan-200 border border-cyan-900/50 hover:border-cyan-700/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                                >
                                    <option value="">All companies</option>
                                    {companyOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    onClick={() => setVisibleCount((c) => c + NEWS_PAGE_SIZE)}
                                    disabled={!hasMoreNews || loadingNews}
                                    className={`text-xs px-2 py-1 rounded-md border ${hasMoreNews && !loadingNews
                                            ? "text-cyan-200 bg-[#0e1c27] border-cyan-900/50 hover:bg-[#112433]"
                                            : "text-cyan-400/50 bg-[#0e1c27] border-cyan-900/50 cursor-not-allowed"
                                        }`}
                                >
                                    Load more
                                </button>
                            </div>

                            {newsError && (
                                <div className="mt-3 text-xs text-red-300 bg-red-900/20 border border-red-800/40 rounded px-2 py-1">
                                    {newsError}
                                </div>
                            )}
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            <AnimatePresence mode="wait">
                                {loadingNews ? (
                                    <motion.div key="news-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <div className="space-y-4">
                                            {[...Array(4)].map((_, i) => (
                                                <div key={i} className="h-28 rounded-xl bg-[#0a161f] border border-cyan-900/40 animate-pulse" />
                                            ))}
                                        </div>
                                    </motion.div>
                                ) : filteredNews.length === 0 ? (
                                    <motion.div key="news-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <div className="flex flex-col items-center justify-center text-center text-cyan-300 p-8 rounded-xl border border-cyan-900/40 bg-gradient-to-b from-[#0d1b24] to-[#0a141d]">
                                            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-[#102231] border border-cyan-900/50 mb-3">
                                                <svg className="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                                                </svg>
                                            </div>
                                            <p className="text-base font-semibold text-cyan-100">No news entries</p>
                                            <p className="text-sm text-cyan-300/70 mt-1">Try another company or refresh.</p>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key={`news-${newsKey}-${selectedCompanyId ?? "all"}-${visibleCount}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="grid grid-cols-1 md:grid-cols-2 gap-5"
                                    >
                                        {filteredNews.map((entry, idx) => {
                                            const k = keyForNews(entry, idx);
                                            const isOpen = expanded.has(k);
                                            return (
                                                <motion.article
                                                    key={k}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.22 }}
                                                    className="group relative flex gap-3 rounded-xl border border-cyan-900/40 bg-gradient-to-br from-[#0a161f] to-[#0e1e2b] p-3 hover:shadow-[0_0_28px_rgba(0,255,255,0.14)]"
                                                >
                                                    <div className="w-28 h-28 min-w-[7rem] rounded-lg overflow-hidden bg-black/30 flex items-center justify-center">
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

                                                    <div className="flex-1 flex flex-col">
                                                        <h4 className="text-cyan-100 font-semibold leading-snug">{entry.title}</h4>

                                                        <div className="flex flex-wrap gap-2 my-2">
                                                            {entry.domains?.map((d, i) => {
                                                                const c = DOMAIN_COLORS[d.toUpperCase()] ?? { bg: "bg-gray-800", text: "text-gray-300" };
                                                                return (
                                                                    <span key={`${d}-${i}`} className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${c.bg} ${c.text}`}>
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
                                                                <span className="px-2 py-0.5 text-[10px] rounded-full border border-purple-400/60 text-purple-300 bg-purple-500/10">
                                                                    {entry.news_tag}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <p className={`text-sm text-gray-300 ${isOpen ? "" : "line-clamp-3"}`}>{entry.content}</p>

                                                        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-700/50">
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
                                <div className="flex justify-center mt-5">
                                    <button
                                        onClick={() => setVisibleCount((c) => c + NEWS_PAGE_SIZE)}
                                        className="px-4 py-2 text-sm rounded-md border border-cyan-900/50 bg-[#0e1c27] text-cyan-200 hover:bg-[#112433]"
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
    );
}
