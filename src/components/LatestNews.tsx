import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, MotionConfig, AnimatePresence } from "framer-motion";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { ArrowUturnLeftIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { news } from "@prisma/client";
import { debounceAsync } from "@/utils/debounce";
import { getNewsOnQuery } from "@/lib/api/manage_news";
import { SmartImage } from "@/components/SmartImage";

const DOMAIN_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
    FINANCE: { bg: "bg-green-900/20", text: "text-green-300", ring: "ring-green-600/40" },
    MARKETING: { bg: "bg-pink-900/20", text: "text-pink-300", ring: "ring-pink-600/40" },
    CONSULTING: { bg: "bg-yellow-900/20", text: "text-yellow-300", ring: "ring-yellow-600/40" },
    PRODMAN: { bg: "bg-cyan-900/20", text: "text-cyan-300", ring: "ring-cyan-600/40" },
    OPERATIONS: { bg: "bg-orange-900/20", text: "text-orange-300", ring: "ring-orange-600/40" },
    GENMAN: { bg: "bg-purple-900/20", text: "text-purple-300", ring: "ring-purple-600/40" },
};

const PAGE_SIZE = 24;
type Cursor = { cursor_id?: number; cursor_ts?: string } | null;

function isoMin(a?: string | null, b?: string | null) {
    if (!a) return b || undefined;
    if (!b) return a || undefined;
    return new Date(a) <= new Date(b) ? a : b;
}

export default function LatestNews() {
    const [newsList, setNewsList] = useState<news[]>([]);
    const [search, setSearch] = useState("");
    const [selectedDomain, setSelectedDomain] = useState("ALL");
    const [dateRange, setDateRange] = useState({ from: "", to: "" });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string>("");

    const [newsDomainTag, setNewsDomainTag] = useState("ALL");
    const [newsSubdomainTag, setNewsSubdomainTag] = useState("ALL");

    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    const [truncated, setTruncated] = useState<Set<number>>(new Set());
    const contentRefs = useRef<Record<number, HTMLParagraphElement | null>>({});

    const [hasMore, setHasMore] = useState(true);
    const [isPageLoading, setIsPageLoading] = useState(false);
    const nextCursorRef = useRef<Cursor>(null);
    const seenIdsRef = useRef<Set<number>>(new Set());

    // Fallback cursor: oldest timestamp we’ve loaded so far (for `to` filter)
    const olderThanRef = useRef<string | null>(null);

    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Build base query from filters only (no cursor here)
    const buildBaseQuery = useCallback(() => {
        const q = new URLSearchParams();
        if (selectedDomain !== "ALL") q.append("domain", selectedDomain);
        if (search.trim()) q.append("title", search.trim());
        if (dateRange.from) q.append("from", dateRange.from);
        if (dateRange.to) q.append("to", dateRange.to);
        if (newsDomainTag !== "ALL") q.append("domain_tag", newsDomainTag);
        if (newsSubdomainTag !== "ALL") q.append("subdomain_tag", newsSubdomainTag);
        q.append("limit", String(PAGE_SIZE));
        return q;
    }, [selectedDomain, search, dateRange.from, dateRange.to, newsDomainTag, newsSubdomainTag]);

    const resetState = useCallback(() => {
        setNewsList([]);
        setExpanded(new Set());
        setTruncated(new Set());
        setHasMore(true);
        seenIdsRef.current.clear();
        nextCursorRef.current = null;
        olderThanRef.current = null;
    }, []);

    // Re-entrancy guard
    const loadingRef = useRef(false);

    const fetchPage = useCallback(
        async (reset = false) => {
            if (!isMountedRef.current) return;
            if (loadingRef.current) return;
            loadingRef.current = true;
            setIsPageLoading(true);
            setErrorMsg("");

            try {
                // Start from base filters
                const q = buildBaseQuery();

                // Prefer backend cursor if provided previously
                const srvCursor = reset ? null : nextCursorRef.current;

                // If backend gave us a cursor, send it back
                if (srvCursor?.cursor_id) q.append("cursor_id", String(srvCursor.cursor_id));
                if (srvCursor?.cursor_ts) q.append("cursor_ts", String(srvCursor.cursor_ts));

                // Fallback: if no server cursor, push pagination via `to` (older-than)
                if (!srvCursor?.cursor_ts && olderThanRef.current) {
                    // Respect user's own `to` filter: take the earlier of the two
                    const userTo = q.get("to");
                    const effTo = isoMin(userTo, olderThanRef.current);
                    if (userTo) q.delete("to");
                    if (effTo) q.append("to", effTo);
                }

                const res: any = await getNewsOnQuery(q);

                let items: any[] = [];
                let page: any = null;

                if (Array.isArray(res)) {
                    items = res;
                } else if (res && typeof res === "object") {
                    if (Array.isArray(res.data)) items = res.data;
                    else if (Array.isArray(res.results)) items = res.results;
                    page = res.page ?? null;
                }

                // Dedupe by numeric id
                const fresh = items.filter((it: any) => {
                    const id = it?.id;
                    if (typeof id !== "number") return true;
                    if (seenIdsRef.current.has(id)) return false;
                    seenIdsRef.current.add(id);
                    return true;
                });

                // Update list
                setNewsList((prev) => (reset ? fresh : [...prev, ...fresh]));

                // If backend pagination is available, use it
                if (page?.next_cursor) {
                    nextCursorRef.current = page.next_cursor;
                    setHasMore(Boolean(page?.has_more));
                    // Also keep a fallback timestamp in case server cursors stop later
                    const oldestOnPage = getOldestISO(fresh);
                    if (oldestOnPage) olderThanRef.current = decOneMs(oldestOnPage);
                } else {
                    // No server cursor: fallback to "older-than" pagination
                    nextCursorRef.current = null;
                    const oldestOnPage = getOldestISO(fresh);
                    if (oldestOnPage) {
                        olderThanRef.current = decOneMs(oldestOnPage);
                        // If we got any fresh items, assume possibly more exist
                        setHasMore(fresh.length > 0);
                    } else {
                        // No new items => no more pages
                        setHasMore(false);
                    }
                }
            } catch (e: any) {
                if (isMountedRef.current) setErrorMsg(e?.message || "Failed to fetch news.");
            } finally {
                if (isMountedRef.current) setIsPageLoading(false);
                loadingRef.current = false;
            }
        },
        [buildBaseQuery]
    );

    // Keep latest fetchPage for stable debounced call
    const fetchPageRef = useRef(fetchPage);
    useEffect(() => {
        fetchPageRef.current = fetchPage;
    }, [fetchPage]);

    // Debounced refetch on search
    const debouncedRefetchAll = useMemo(
        () =>
            debounceAsync(async () => {
                resetState();
                await fetchPageRef.current(true);
            }, 350),
        [resetState]
    );

    // Initial + filter-driven fetch
    useEffect(() => {
        (async () => {
            setLoading(true);
            resetState();
            await fetchPage(true);
            if (isMountedRef.current) setLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDomain, dateRange.from, dateRange.to, newsDomainTag, newsSubdomainTag]);

    // Debounced search
    useEffect(() => {
        debouncedRefetchAll();
    }, [search, debouncedRefetchAll]);

    const groupedNews = useMemo(() => {
        const grouped: Record<string, news[]> = {};
        newsList.forEach((item) => {
            const d = item?.created_at ? new Date(item.created_at) : new Date();
            const dateKey = format(d, "yyyy-MM-dd");
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(item);
        });
        return Object.fromEntries(Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)));
    }, [newsList]);

    // ---- Read-more measurement
    const measureTruncation = useCallback(() => {
        const next = new Set<number>();
        for (const [k, el] of Object.entries(contentRefs.current)) {
            const id = Number(k);
            if (!el) continue;
            if (expanded.has(id)) continue;

            const clampHeight = el.clientHeight;
            const original = {
                display: el.style.display,
                WebkitLineClamp: (el.style as any).WebkitLineClamp,
                WebkitBoxOrient: (el.style as any).WebkitBoxOrient,
                overflow: el.style.overflow,
            };

            el.style.display = "block";
            (el.style as any).WebkitLineClamp = "unset";
            (el.style as any).WebkitBoxOrient = "unset";
            el.style.overflow = "visible";

            const expandedHeight = el.scrollHeight;

            el.style.display = original.display;
            (el.style as any).WebkitLineClamp = original.WebkitLineClamp;
            (el.style as any).WebkitBoxOrient = original.WebkitBoxOrient;
            el.style.overflow = original.overflow;

            if (expandedHeight > clampHeight + 1) next.add(id);
        }
        setTruncated(next);
    }, [expanded]);

    useEffect(() => {
        const raf = requestAnimationFrame(measureTruncation);
        const onResize = () => measureTruncation();
        window.addEventListener("resize", onResize);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", onResize);
        };
    }, [groupedNews, expanded, measureTruncation]);

    // ---- Infinite scroll triggers only after user scrolls
    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const userHasScrolledRef = useRef(false);

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;
        const onScroll = () => {
            if (el.scrollTop > 0) userHasScrolledRef.current = true;
        };
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        const root = scrollerRef.current;
        if (!root) return;

        const obs = new IntersectionObserver(
            (entries) => {
                if (!userHasScrolledRef.current) return;
                if (entries.some((e) => e.isIntersecting)) {
                    if (hasMore && !loadingRef.current) {
                        fetchPageRef.current(false);
                    }
                }
            },
            { root, rootMargin: "600px 0px", threshold: 0.01 }
        );

        if (sentinelRef.current) obs.observe(sentinelRef.current);
        return () => obs.disconnect();
    }, [hasMore]);

    const EASE: [number, number, number, number] = [0.2, 0.8, 0.2, 1];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#050b10] via-[#07131a] to-[#041019] text-cyan-200">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }} className="w-10 h-10">
                    <ArrowPathIcon className="w-10 h-10 text-cyan-400" />
                </motion.div>
            </div>
        );
    }

    return (
        <MotionConfig transition={{ duration: 0.18, ease: EASE }} reducedMotion="user">
            <div className="min-h-full w-full bg-gradient-to-br from-[#050b10] via-[#07131a] to-[#041019] text-cyan-100 px-4 md:px-8 pt-4 pb-10 overflow-hidden">
                {/* Sticky controls */}
                <motion.div className="sticky top-0 z-20 rounded-2xl border border-cyan-700/40 bg-[#081219] px-3 sm:px-4 lg:px-6 py-3" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                            <motion.button
                                onClick={() => {
                                    setIsRefreshing(true);
                                    resetState();
                                    fetchPage(true).finally(() => setIsRefreshing(false));
                                }}
                                disabled={isRefreshing}
                                className={`p-2 rounded-full border transition ${isRefreshing ? "border-cyan-700/60 text-cyan-300 bg-[#0b1f2b] cursor-wait" : "border-cyan-700/50 text-cyan-100 bg-[#0a1820] hover:border-cyan-400/60"
                                    }`}
                                title="Refresh news"
                                aria-label="Refresh news"
                                whileTap={{ scale: 0.96 }}
                            >
                                <motion.span
                                    animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                                    transition={{ repeat: isRefreshing ? Infinity : 0, repeatType: "loop", ease: "linear", duration: 1 }}
                                    className="inline-flex"
                                >
                                    <ArrowPathIcon className="h-5 w-5" />
                                </motion.span>
                            </motion.button>

                            <motion.button
                                onClick={() => {
                                    setIsResetting(true);
                                    setSearch("");
                                    setSelectedDomain("ALL");
                                    setDateRange({ from: "", to: "" });
                                    setNewsDomainTag("ALL");
                                    setNewsSubdomainTag("ALL");
                                    setExpanded(new Set());
                                    resetState();
                                    fetchPage(true);
                                    setTimeout(() => setIsResetting(false), 350);
                                }}
                                className="p-2 rounded-full border border-rose-800 text-rose-400 hover:text-white hover:border-rose-500 bg-[#0a1820] transition"
                                title="Reset filters"
                                aria-label="Reset filters"
                                whileTap={{ scale: 0.96 }}
                            >
                                <motion.span animate={isResetting ? { x: [-5, 0] } : { x: 0 }} transition={{ type: "spring", stiffness: 300, damping: 12 }} className="inline-flex">
                                    <ArrowUturnLeftIcon className="h-5 w-5" />
                                </motion.span>
                            </motion.button>

                            <select
                                value={newsDomainTag}
                                onChange={(e) => setNewsDomainTag(e.target.value)}
                                className="px-3 py-1.5 text-xs rounded-full bg-[#0a1820] text-cyan-100 border border-cyan-700/50 hover:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                            >
                                <option value="ALL">All News Domain Tags</option>
                                {["BUSINESS", "WORLD", "TECHNOLOGY", "COMPANY"].map((tag) => (
                                    <option key={tag} value={tag}>
                                        {tag}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="date"
                                value={dateRange.from}
                                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                                className="px-3 py-1.5 text-xs rounded-full bg-[#0a1820] text-cyan-100 border border-cyan-700/50 hover:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                            />
                            <span className="text-cyan-400 text-xs">to</span>
                            <input
                                type="date"
                                value={dateRange.to}
                                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                                className="px-3 py-1.5 text-xs rounded-full bg-[#0a1820] text-cyan-100 border border-cyan-700/50 hover:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                            />

                            <motion.div className="relative" whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.99 }}>
                                <motion.input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search news…"
                                    whileFocus={{ scale: 1.02 }}
                                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                                    className="px-3 py-1.5 text-sm rounded-xl w-64 max-w-[70vw] bg-[#0a1820] border border-cyan-700/50 placeholder-cyan-500 text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                />
                            </motion.div>
                        </div>

                        <AnimatePresence>
                            {errorMsg && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    className="text-sm px-3 py-1.5 rounded-md border border-rose-900/60 bg-rose-900/20 text-rose-200"
                                >
                                    {errorMsg}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                <div ref={scrollerRef} className="overflow-y-auto max-h-[calc(100vh-12rem)] pr-1.5 mt-5">
                    {newsList.length > 0 ? (
                        <>
                            {Object.entries(groupedNews).map(([date, newsItems]) => (
                                <motion.section key={date} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mt-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <h2 className="text-lg font-semibold text-cyan-200">{format(new Date(date), "dd MMM yyyy")}</h2>
                                        <div className="h-px flex-1 ml-4 bg-gradient-to-r from-transparent via-cyan-800/40 to-transparent" />
                                    </div>

                                    <div className="columns-1 sm:columns-2 lg:columns-4 gap-5 [column-fill:_balance]">
                                        {newsItems.map((n) => {
                                            const sourceHref =
                                                (n as any)?.link_to_source || (n as any)?.source_link || (n as any)?.url || (n as any)?.link || "";

                                            const domainObjs: any[] = Array.isArray((n as any)?.domains) ? (n as any).domains : [];
                                            const domains: string[] = domainObjs.map((d) => d?.domain).filter(Boolean);

                                            const subdomainTag = (n as any)?.subdomain_tag as string | undefined;
                                            const newsTag = (n as any)?.news_tag as string | undefined;
                                            const role = ((n as any)?.role as string | undefined) || undefined;

                                            const companiesArr: any[] = Array.isArray((n as any)?.companies) ? (n as any).companies : [];
                                            const companyNamesFromArray = companiesArr
                                                .map(
                                                    (c) =>
                                                        c?.company?.company_full ||
                                                        c?.company?.company_name ||
                                                        c?.company_full ||
                                                        c?.company_name ||
                                                        c?.name ||
                                                        (typeof c === "string" ? c : "")
                                                )
                                                .filter(Boolean) as string[];

                                            const companyNamesList: string[] =
                                                (Array.isArray((n as any)?.company_names) && (n as any).company_names) || companyNamesFromArray || [];

                                            const companyIds: number[] =
                                                (Array.isArray((n as any)?.company_ids) && (n as any).company_ids) ||
                                                companiesArr.map((c) => c?.company?.id).filter(Boolean) ||
                                                [];

                                            const companyChips: string[] =
                                                companyNamesList.length > 0 ? companyNamesList : companyIds.map((id) => `Company #${id}`);

                                            const idKey = (n as any)?.id as number;
                                            const contentStr = ((n as any)?.content as string) || "";
                                            const isExpanded = expanded.has(idKey);
                                            const showToggle = isExpanded ? true : truncated.has(idKey);

                                            return (
                                                <article
                                                    key={`${(n as any)?.id}-${(n as any)?.updated_at}`}
                                                    className="mb-5 overflow-hidden rounded-2xl border border-cyan-700/40 bg-[#081219] break-inside-avoid print:break-inside-avoid-page"
                                                    style={{
                                                        breakInside: "avoid",
                                                        pageBreakInside: "avoid",
                                                        ...({ WebkitColumnBreakInside: "avoid" } as any),
                                                    }}
                                                >
                                                    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.18, ease: "easeInOut" }} className="h-full">
                                                        {/* Row 1: role + tags + source icon */}
                                                        <div className="px-3 pt-3">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    {role && (
                                                                        <span className="px-2 py-0.5 text-[10px] rounded-full border border-amber-500/40 text-amber-300 bg-amber-900/10">
                                                                            {role}
                                                                        </span>
                                                                    )}
                                                                    {domains.map((d, i) => {
                                                                        const key = (d || "").toUpperCase();
                                                                        const c =
                                                                            DOMAIN_COLORS[key] || { bg: "bg-slate-800/50", text: "text-slate-300", ring: "ring-slate-600/30" };
                                                                        return (
                                                                            <span
                                                                                key={`${d}-${i}`}
                                                                                className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${c.bg} ${c.text} ring-1 ring-inset ${c.ring}`}
                                                                            >
                                                                                {d}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                    {subdomainTag && (
                                                                        <span className="px-2 py-0.5 text-[10px] rounded-full border border-cyan-600/50 text-cyan-300 bg-cyan-900/10">
                                                                            {subdomainTag}
                                                                        </span>
                                                                    )}
                                                                    {newsTag && (
                                                                        <span className="px-2 py-0.5 text-[10px] rounded-full border border-purple-600/40 text-purple-300 bg-purple-900/10">
                                                                            {newsTag}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {sourceHref ? (
                                                                    <a
                                                                        href={sourceHref}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="p-1.5 rounded-md hover:bg-white/5 transition"
                                                                        title="Open source"
                                                                        aria-label="Open original source"
                                                                    >
                                                                        <ArrowTopRightOnSquareIcon className="w-5 h-5 text-cyan-300" />
                                                                    </a>
                                                                ) : null}
                                                            </div>
                                                        </div>

                                                        {/* Row 2: company tags */}
                                                        {companyChips.length > 0 && (
                                                            <div className="px-3 mt-2">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    {companyChips.map((label, idx) => (
                                                                        <span
                                                                            key={`${label}-${idx}`}
                                                                            className="px-2 py-0.5 text-[10px] rounded-full border border-teal-600/40 text-teal-300 bg-teal-900/10"
                                                                            title={label}
                                                                        >
                                                                            {label}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Title */}
                                                        <div className="px-3 mt-2">
                                                            <h3 className="text-cyan-100 font-semibold leading-snug">{(n as any)?.title ?? "Untitled"}</h3>
                                                        </div>

                                                        {/* Image */}
                                                        <div className="mt-3 mx-3 rounded-lg overflow-hidden bg-black/30">
                                                            <SmartImage
                                                                newsTag={(newsTag || "").toString()}
                                                                src={(n as any)?.image_url || undefined}
                                                                className="w-full h-40 object-cover"
                                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                                                tagImageMap={{
                                                                    TECHNOLOGY:
                                                                        "https://firebasestorage.googleapis.com/v0/b/vidyarth-systems.firebasestorage.app/o/news-images%2Ftechnology_news_image_default.webp?alt=media&token=b772efb1-1968-4d25-9c2b-7970b703c443",
                                                                    WORLD:
                                                                        "https://firebasestorage.googleapis.com/v0/b/vidyarth-systems.firebasestorage.app/o/news-images%2Fworld_news_image_default.jpg?alt=media&token=e07f6e34-bc35-4bec-b3b5-d07a2df98f00",
                                                                    BUSINESS:
                                                                        "https://firebasestorage.googleapis.com/v0/b/vidyarth-systems.firebasestorage.app/o/news-images%2Fbusiness_news_image_default.jpg?alt=media&token=7f64fb7a-43ad-4df4-8b7a-4b2fd9d5643b",
                                                                }}
                                                                {...(companyIds[0] ? ({ companyId: companyIds[0] } as any) : {})}
                                                            />
                                                        </div>

                                                        {/* Content + conditional Read more */}
                                                        <div className="px-3 pb-3 mt-3">
                                                            <p
                                                                ref={(el) => {
                                                                    contentRefs.current[idKey] = el;
                                                                }}
                                                                className={`text-sm text-cyan-100/90 leading-relaxed ${isExpanded ? "" : "line-clamp-5"}`}
                                                            >
                                                                {contentStr}
                                                            </p>

                                                            {showToggle && (
                                                                <div className="mt-2 flex justify-end">
                                                                    <button
                                                                        onClick={() =>
                                                                            setExpanded((prev) => {
                                                                                const next = new Set(prev);
                                                                                next.has(idKey) ? next.delete(idKey) : next.add(idKey);
                                                                                return next;
                                                                            })
                                                                        }
                                                                        className="text-xs text-cyan-300 font-medium hover:underline"
                                                                        aria-pressed={isExpanded}
                                                                    >
                                                                        {isExpanded ? "Show less" : "Read more"}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                </motion.section>
                            ))}

                            <div ref={sentinelRef} className="h-12 flex items-center justify-center">
                                {isPageLoading ? (
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }} className="w-6 h-6">
                                        <ArrowPathIcon className="w-6 h-6 text-cyan-400" />
                                    </motion.div>
                                ) : hasMore ? (
                                    <button
                                        onClick={() => fetchPage(false)}
                                        className="px-3 py-1.5 text-xs rounded-full border border-cyan-700/50 bg-[#0a1820] text-cyan-100 hover:border-cyan-400/60"
                                    >
                                        Load more
                                    </button>
                                ) : (
                                    <span className="text-xs text-cyan-400/70">No more results</span>
                                )}
                            </div>
                        </>
                    ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center text-cyan-300/90 py-16">
                            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-cyan-800/40 bg-gradient-to-b from-[#0b1f29] to-[#0a1820]">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25m-7.5 3.75V5.25M3 9h18M4.5 19.5h15a.75.75 0 00.75-.75V9.75H3.75v9a.75.75 0 00.75.75z" />
                                </svg>
                                <span>No news found. Try adjusting filters or search.</span>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </MotionConfig>
    );
}

function getOldestISO(items: any[]): string | null {
    let oldest: string | null = null;
    for (const it of items) {
        const ts = it?.created_at ? new Date(it.created_at).toISOString() : null;
        if (!ts) continue;
        if (!oldest || new Date(ts) < new Date(oldest)) oldest = ts;
    }
    return oldest;
}

function decOneMs(iso: string): string {
    const t = new Date(iso).getTime() - 1;
    return new Date(t).toISOString().slice(0, 19); // keep "YYYY-MM-DDTHH:mm:ss"
}
