import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "framer-motion";
import type { Transition } from "framer-motion";
import {
    ArrowPathIcon,
    Bars3Icon,
    Squares2X2Icon,
    ChevronDownIcon,
    FunnelIcon,
    AdjustmentsHorizontalIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import { ACCESS_PERMISSION } from "@prisma/client";
import { ALL_DOMAINS } from "./ManageCompanyList";
import type { Company } from "./CompanySearchDropDown";
import { fetchCompanyListWithPermission } from "@/lib/api/company";
import { toast } from "react-hot-toast";

function groupByFirstLetter(
    companies: Company[],
    cmp?: (a: Company, b: Company) => number
): Record<string, Company[]> {
    const grouped: Record<string, Company[]> = {};
    companies.forEach((company) => {
        const firstLetter = company.company_full?.[0]?.toUpperCase() || "#";
        if (!grouped[firstLetter]) grouped[firstLetter] = [];
        grouped[firstLetter].push(company);
    });
    const letters = Object.keys(grouped).sort();
    const out: Record<string, Company[]> = {};
    for (const key of letters) out[key] = cmp ? [...grouped[key]].sort(cmp) : [...grouped[key]];
    return out;
}

interface AllCompaniesDirectoryProps {
    onCompanySelected?: (company: Company) => void;
}

function SkeletonCard({ dense = false }: { dense?: boolean }) {
    return (
        <div
            className={`animate-pulse rounded-xl border border-cyan-600/20 bg-[#0b1820] w-full transition-all ${dense ? "p-2" : "p-3"
                }`}
        >
            <div className="flex items-start gap-2">
                <div className={`rounded-full bg-cyan-800/20 ${dense ? "h-8 w-8" : "h-10 w-10"}`} />
                <div className="flex-1 space-y-1.5">
                    <div className={`bg-cyan-800/20 rounded ${dense ? "h-3 w-2/3" : "h-3.5 w-3/4"}`} />
                    <div className={`bg-cyan-800/20 rounded ${dense ? "h-2.5 w-1/3" : "h-3 w-1/2"}`} />
                    <div className="flex gap-1">
                        <div className={`bg-cyan-800/20 rounded-full ${dense ? "h-3 w-8" : "h-3.5 w-10"}`} />
                        <div className={`bg-cyan-800/20 rounded-full ${dense ? "h-3 w-8" : "h-3.5 w-10"}`} />
                    </div>
                </div>
            </div>
        </div>
    );
}

type SortKey = "NAME_ASC" | "NAME_DESC";
const AZ_LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

function useOutsideClose<T extends HTMLElement>(
    ref: React.RefObject<T | null>,
    onClose: () => void
) {
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (!ref.current) return;
            if (!ref.current.contains(e.target as Node)) onClose();
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [ref, onClose]);
}

function DomainChip({
    text,
    className = "",
}: { text: string; className?: string }) {
    return (
        <span
            className={`px-1.5 py-0.5 rounded-full border font-medium 
        max-w-[7.5rem] xs:max-w-[8.5rem] sm:max-w-[9.5rem] md:max-w-[10.5rem]
        overflow-hidden text-ellipsis whitespace-nowrap ${className}`}
            title={text}
        >
            {text}
        </span>
    );
}

function LogoBox({
    src,
    alt,
    box = "h-11 w-11",
    img = "h-7 w-7",
}: { src?: string; alt: string; box?: string; img?: string }) {
    return (
        <div className={`${box} rounded-lg grid place-items-center bg-white ring-1 ring-white/5 shrink-0`}>
            {src ? (
                <img
                    src={src}
                    alt={alt}
                    className={`${img} object-contain`}
                    loading="lazy"
                    decoding="async"
                />
            ) : null}
        </div>
    );
}


function Dropdown({
    trigger,
    open,
    onOpenChange,
    children,
    align = "left",
}: {
    trigger: React.ReactNode;
    open: boolean;
    onOpenChange: (v: boolean) => void;
    children: React.ReactNode;
    align?: "left" | "right";
}) {
    const ref = useRef<HTMLDivElement>(null);
    useOutsideClose(ref, () => onOpenChange(false));
    const easeOutCB = [0.2, 0.8, 0.2, 1] as const;

    return (
        <div className="relative z-30" ref={ref}>
            <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onOpenChange(!open)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-cyan-700/50 bg-[#081219] text-cyan-100 hover:border-cyan-400/60 text-sm transition"
            >
                {trigger}
                <ChevronDownIcon className="w-4 h-4 opacity-80" />
            </motion.button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 8, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: easeOutCB }}
                        className={`absolute z-[999] mt-1 min-w-[220px] rounded-xl border border-cyan-700/50 bg-[#0c1a22] shadow-lg ${align === "right" ? "right-0" : "left-0"
                            }`}
                    >
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-2">
                            {children}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function LetterRail({
    activeLetters,
    activeLetter,
    onJump,
}: {
    activeLetters: string[];
    activeLetter: string | null;
    onJump: () => void;
}) {
    return (
        <motion.div
            layout="position"
            className="h-full w-10 md:w-11 rounded-xl bg-[#081219]/95 backdrop-blur-sm border border-cyan-700/40 flex flex-col"
        >
            <div className="h-full flex flex-col justify-between items-stretch px-1 py-2 md:py-2.5">
                {AZ_LETTERS.map((letter) => {
                    const isPresent = activeLetters.includes(letter);
                    const isActive = activeLetter === letter;

                    if (isPresent) {
                        return (
                            <motion.a
                                key={letter}
                                href={`#${letter}`}
                                onClick={onJump}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                className={`w-full h-8 md:h-8.5 rounded-lg grid place-items-center
                  text-[11px] md:text-[11.5px] font-semibold tracking-wide transition-colors
                  ${isActive
                                        ? "bg-gradient-to-br from-cyan-600/25 to-teal-500/20 text-cyan-100 ring-1 ring-cyan-400/30"
                                        : "text-cyan-300/80 hover:text-cyan-100 hover:bg-white/5"
                                    }`}
                            >
                                {letter}
                            </motion.a>
                        );
                    }

                    return (
                        <div
                            key={letter}
                            className="w-full h-8 md:h-8.5 rounded-lg grid place-items-center
                text-[11px] md:text-[11.5px] font-semibold tracking-wide
                text-cyan-600/40 border border-transparent select-none cursor-default"
                        >
                            {letter}
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}

export default function AllCompaniesDirectory({ onCompanySelected }: AllCompaniesDirectoryProps) {
    const [allCompanies, setAllCompanies] = useState<Company[]>([]);
    const [groupedCompanies, setGroupedCompanies] = useState<Record<string, Company[]>>({});
    const [selectedDomain, setSelectedDomain] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [sortKey, setSortKey] = useState<SortKey>("NAME_ASC");
    const [activeLetter, setActiveLetter] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [visibleCompanyCount, setVisibleCompanyCount] = useState(12);
    const [loadingMore, setLoadingMore] = useState(false);
    const [suppressObserver, setSuppressObserver] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const totalFiltered = useMemo(
        () => Object.values(groupedCompanies).reduce((n, a) => n + a.length, 0),
        [groupedCompanies]
    );
    const [openDomain, setOpenDomain] = useState(false);
    const [openSort, setOpenSort] = useState(false);
    const [compact, setCompact] = useState(true);
    const [showLogos, setShowLogos] = useState(true);

    const easeOutCB = [0.2, 0.8, 0.2, 1] as const;
    const linearCB = [0, 0, 1, 1] as const;
    const fade: Transition = { duration: 0.18, ease: easeOutCB };
    const spring = { type: "spring", stiffness: 280, damping: 36, mass: 0.9 } as const;

    // ====== NEW: Refs & state for fixed desktop rail alignment ======
    const containerRef = useRef<HTMLDivElement>(null); // wraps the grid
    const fixedRailRef = useRef<HTMLDivElement>(null);
    const [railLeft, setRailLeft] = useState<number>(0);

    const updateRailLeft = () => {
        const container = containerRef.current;
        const rail = fixedRailRef.current;
        if (!container || !rail) return;

        const rect = container.getBoundingClientRect(); // viewport coords
        const railWidth = rail.offsetWidth || 44; // md:w-11 fallback
        const gap = 8; // match grid gap-2 (0.5rem)
        // place rail just OUTSIDE the container's right edge, but clamp inside viewport
        const desiredLeft = rect.right + gap - railWidth; // align with a small interior gap
        const viewportWidth = document.documentElement.clientWidth;
        const clampedLeft = Math.min(
            Math.max(desiredLeft, 8), // at least 8px from left
            viewportWidth - railWidth - 8 // at least 8px from right
        );
        setRailLeft(clampedLeft);
    };

    useEffect(() => {
        updateRailLeft();
        const ro = new ResizeObserver(() => updateRailLeft());
        if (containerRef.current) ro.observe(containerRef.current);
        const onResize = () => updateRailLeft();
        window.addEventListener("resize", onResize);
        // vertical scroll doesn't affect left, but if you have horizontal scroll in rare cases:
        window.addEventListener("scroll", onResize, { passive: true });
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", onResize);
            window.removeEventListener("scroll", onResize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!sentinelRef.current) return;
        const el = sentinelRef.current;
        const observer = new IntersectionObserver(
            async ([entry]) => {
                if (!entry.isIntersecting || loadingMore || visibleCompanyCount >= totalFiltered) return;
                setLoadingMore(true);
                await new Promise((res) => setTimeout(res, 200));
                setVisibleCompanyCount((prev) => Math.min(prev + (compact ? 48 : 28), totalFiltered));
                setLoadingMore(false);
            },
            { root: null, rootMargin: "100px 0px", threshold: 0 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [loadingMore, totalFiltered, visibleCompanyCount, compact]);

    const fetchData = async () => {
        setIsRefreshing(true);
        try {
            const res = await fetchCompanyListWithPermission(ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY);
            if (!res?.success) {
                toast.error(res?.error || "Failed to fetch company list.");
                setAllCompanies([]);
                return;
            }
            setAllCompanies(res.data || []);
        } catch (e: any) {
            toast.error(e?.message || "Failed to fetch company list.");
            setAllCompanies([]);
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setIsLoading(true);
            try {
                const res = await fetchCompanyListWithPermission(ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY);
                if (cancelled) return;
                if (!res?.success) {
                    toast.error(res?.error || "Failed to fetch company list.");
                    setAllCompanies([]);
                } else {
                    setAllCompanies(res.data || []);
                }
            } catch (e: any) {
                if (!cancelled) {
                    toast.error(e?.message || "Failed to fetch company list.");
                    setAllCompanies([]);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const el =
            (document.getElementById("app-topbar") ||
                (document.querySelector("[data-app-topbar]") as HTMLElement | null)) ?? null;
        const h = el?.offsetHeight ?? 56;
        document.documentElement.style.setProperty("--topbar-h", `${h}px`);
        // re-align rail when topbar height known
        updateRailLeft();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visibleSections = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visibleSections.length > 0 && !suppressObserver) setActiveLetter(visibleSections[0].target.id);
            },
            { root: null, rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.1, 0.9] }
        );
        const timeout = setTimeout(() => {
            Object.keys(groupedCompanies).forEach((letter) => {
                const el = document.getElementById(letter);
                if (el) observer.observe(el);
            });
        }, 100);
        return () => {
            clearTimeout(timeout);
            observer.disconnect();
        };
    }, [groupedCompanies, suppressObserver]);

    const filteredAndSorted = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        let base =
            selectedDomain === "ALL"
                ? allCompanies
                : allCompanies.filter((company) =>
                    company.domains.some((d) => (typeof d === "string" ? d : d.domain) === selectedDomain)
                );
        if (q) {
            base = base.filter((c) => {
                const n1 = c.company_name?.toLowerCase() || "";
                const n2 = c.company_full?.toLowerCase() || "";
                return n1.includes(q) || n2.includes(q);
            });
        }
        const sorted = [...base].sort((a, b) => {
            const A = a.company_name || a.company_full || "";
            const B = b.company_name || b.company_full || "";
            return sortKey === "NAME_ASC" ? A.localeCompare(B) : B.localeCompare(A);
        });
        return sorted;
    }, [allCompanies, selectedDomain, searchQuery, sortKey]);

    useEffect(() => {
        const cmp = (a: Company, b: Company) => {
            const A = a.company_name || a.company_full || "";
            const B = b.company_name || b.company_full || "";
            return sortKey === "NAME_ASC" ? A.localeCompare(B) : B.localeCompare(A);
        };
        setGroupedCompanies(groupByFirstLetter(filteredAndSorted, cmp));
        setVisibleCompanyCount(compact ? 18 : 12);
    }, [filteredAndSorted, sortKey, compact]);

    const getDomainStyle = (domain: string) => {
        const styles: Record<string, string> = {
            FINANCE: "bg-[#05241b] text-emerald-300 border-emerald-700/30",
            MARKETING: "bg-[#2b0a12] text-rose-300 border-rose-700/30",
            CONSULTING: "bg-[#061b26] text-sky-300 border-sky-700/30",
            PRODMAN: "bg-[#1c1236] text-violet-300 border-violet-700/30",
            OPERATIONS: "bg-[#251a06] text-amber-300 border-amber-700/30",
            GENMAN: "bg-[#072420] text-teal-300 border-teal-700/30",
        };
        return styles[domain] || "bg-[#0b1820] text-cyan-200 border-cyan-900/30";
    };

    const activeLetters = Object.keys(groupedCompanies).sort();

    const density = {
        gridColsLogos: compact
            ? "grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
            : "grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
        gridColsNoLogos: compact
            ? "grid-cols-2 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8"
            : "grid-cols-1 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7",
        gridGap: compact ? (showLogos ? "gap-2" : "gap-1.5") : showLogos ? "gap-3" : "gap-2",
        cardPad: compact ? (showLogos ? "p-2" : "p-1.5") : showLogos ? "p-3" : "p-2",
        nameSize: compact ? "text-[12.5px]" : "text-sm",
        subSize: compact ? "text-[11px]" : "text-xs",
        logoBox: compact ? "h-9 w-9" : "h-11 w-11",
        logoImg: compact ? "h-6 w-6" : "h-7 w-7",
        chipText: compact ? "text-[0.58rem]" : "text-[0.65rem]",
        chipsTop: compact ? "mt-1" : "mt-1.5",
        maxChips: compact ? 1 : 2,
        radius: "rounded-xl",
    };

    return (
        <MotionConfig transition={{ duration: 0.16, ease: easeOutCB }} reducedMotion="user">
            {/* Mobile letter rail fixed at the bottom (unchanged) */}
            <div className="sm:hidden fixed inset-x-2 bottom-[max(env(safe-area-inset-bottom),0.5rem)] z-50 pointer-events-none">
                <div className="pointer-events-auto rounded-xl bg-[#081219]/95 border border-cyan-700/40 px-2 py-1.5 overflow-x-auto no-scrollbar backdrop-blur supports-[backdrop-filter]:backdrop-blur shadow-lg">
                    <div className="flex gap-1">
                        {activeLetters.map((letter) => (
                            <motion.a
                                key={letter}
                                href={`#${letter}`}
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                className={`px-2 h-7 rounded-lg grid place-items-center text-[12px] font-semibold ${activeLetter === letter
                                        ? "bg-gradient-to-br from-cyan-600/25 to-teal-500/20 text-cyan-100 ring-1 ring-cyan-400/30"
                                        : "text-cyan-300/80 hover:text-cyan-100 hover:bg-white/5"
                                    }`}
                            >
                                {letter}
                            </motion.a>
                        ))}
                    </div>
                </div>
            </div>

            <LayoutGroup>
                <motion.div
                    layout="position"
                    className="p-1 sm:p-2 relative min-h-full bg-gradient-to-br from-[#050b10] via-[#07131a] to-[#041019] isolate"
                >
                    <div ref={containerRef} className="w-full max-w-[1200px] mx-auto relative">
                        {/* Grid: content + (placeholder) sticky rail column */}
                        <div className="grid items-start sm:grid-cols-[minmax(0,1fr)_2.75rem] md:grid-cols-[minmax(0,1fr)_3rem] gap-2">
                            {/* LEFT: content */}
                            <div className="grid grid-rows-[auto_1fr] gap-3 min-h-[calc(100vh-var(--topbar-h,56px)-1.5rem)]">
                                <motion.div
                                    layout="position"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={fade}
                                    className="relative z-30 border border-cyan-700/40 rounded-xl p-3 sm:p-3.5 bg-[#081219]/85 backdrop-blur"
                                >
                                    <motion.div layout="position" className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                                        <motion.div
                                            layout="position"
                                            className="flex items-center gap-2 rounded-full border border-cyan-700/50 bg-[#0a1820] text-cyan-100 focus-within:ring-1 focus-within:ring-cyan-500/40 transition px-3 py-1.5"
                                        >
                                            <MagnifyingGlassIcon className="w-4 h-4 opacity-80" />
                                            <input
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search company..."
                                                className="outline-none placeholder:text-cyan-400/70 bg-transparent text-cyan-100 transition-all w-56 sm:w-64 text-sm"
                                            />
                                        </motion.div>

                                        <Dropdown
                                            open={openDomain}
                                            onOpenChange={setOpenDomain}
                                            trigger={
                                                <span className="inline-flex items-center gap-2 text-cyan-100">
                                                    <FunnelIcon className="w-4 h-4" />
                                                    <span className="text-sm">
                                                        {selectedDomain === "ALL" ? "All Domains" : selectedDomain}
                                                    </span>
                                                </span>
                                            }
                                        >
                                            <div className="space-y-1">
                                                <motion.button
                                                    whileHover={{ x: 2 }}
                                                    onClick={() => {
                                                        setSelectedDomain("ALL");
                                                        setOpenDomain(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${selectedDomain === "ALL"
                                                            ? "bg-cyan-900/30 text-cyan-100"
                                                            : "hover:bg-cyan-900/20 text-cyan-100"
                                                        }`}
                                                >
                                                    All
                                                </motion.button>
                                                <div className="max-h-56 overflow-y-auto pr-1">
                                                    {ALL_DOMAINS.map((d) => (
                                                        <motion.button
                                                            whileHover={{ x: 2 }}
                                                            key={d}
                                                            onClick={() => {
                                                                setSelectedDomain(d);
                                                                setOpenDomain(false);
                                                            }}
                                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${selectedDomain === d
                                                                    ? "bg-cyan-900/30 text-cyan-100"
                                                                    : "hover:bg-cyan-900/20 text-cyan-100"
                                                                }`}
                                                        >
                                                            {d}
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            </div>
                                        </Dropdown>

                                        {/* <Dropdown
                                            open={openSort}
                                            onOpenChange={setOpenSort}
                                            align="right"
                                            trigger={
                                                <span className="inline-flex items-center gap-2 text-cyan-100">
                                                    <AdjustmentsHorizontalIcon className="w-4 h-4" />
                                                    <span className="text-sm">
                                                        {sortKey === "NAME_ASC" ? "Name A → Z" : "Name Z → A"}
                                                    </span>
                                                </span>
                                            }
                                        >
                                            <div className="space-y-1">
                                                <motion.button
                                                    whileHover={{ x: 2 }}
                                                    onClick={() => {
                                                        setSortKey("NAME_ASC");
                                                        setOpenSort(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${sortKey === "NAME_ASC"
                                                            ? "bg-cyan-900/30 text-cyan-100"
                                                            : "hover:bg-cyan-900/20 text-cyan-100"
                                                        }`}
                                                >
                                                    Name A → Z
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ x: 2 }}
                                                    onClick={() => {
                                                        setSortKey("NAME_DESC");
                                                        setOpenSort(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${sortKey === "NAME_DESC"
                                                            ? "bg-cyan-900/30 text-cyan-100"
                                                            : "hover:bg-cyan-900/20 text-cyan-100"
                                                        }`}
                                                >
                                                    Name Z → A
                                                </motion.button>
                                            </div>
                                        </Dropdown> */}

                                        <motion.button
                                            layout="position"
                                            transition={spring}
                                            whileTap={{ scale: 0.98 }}
                                            whileHover={{ scale: 1.01 }}
                                            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition ${viewMode === "grid"
                                                    ? "bg-[#0a1820] text-cyan-100 border-cyan-700/50 hover:border-cyan-400/60"
                                                    : "bg-cyan-900/30 text-cyan-100 border-cyan-700/50 hover:border-cyan-400/60"
                                                }`}
                                        >
                                            {viewMode === "list" ? (
                                                <Bars3Icon className="w-4 h-4" />
                                            ) : (
                                                <Squares2X2Icon className="w-4 h-4" />
                                            )}
                                            {viewMode === "grid" ? "Grid" : "List"}
                                        </motion.button>

                                        <motion.button
                                            layout="position"
                                            onClick={() => setCompact((v) => !v)}
                                            className={`px-3 py-1.5 rounded-full border text-sm transition ${compact
                                                    ? "bg-cyan-900/40 border-cyan-700 text-cyan-100"
                                                    : "bg-[#0a1820] border-cyan-800/50 text-cyan-200"
                                                }`}
                                            title="Toggle density"
                                        >
                                            {compact ? "Compact" : "Comfort"}
                                        </motion.button>

                                        <motion.button
                                            layout="position"
                                            onClick={() => setShowLogos((v) => !v)}
                                            className={`px-3 py-1.5 rounded-full border text-sm transition ${showLogos
                                                    ? "bg-cyan-900/40 border-cyan-700 text-cyan-100"
                                                    : "bg-[#0a1820] border-cyan-800/50 text-cyan-200"
                                                }`}
                                            title="Toggle logos"
                                        >
                                            {showLogos ? "Logos On" : "Logos Off"}
                                        </motion.button>

                                        <motion.button
                                            layout="position"
                                            whileTap={{ rotate: -10, scale: 0.98 }}
                                            whileHover={{ scale: 1.02 }}
                                            onClick={fetchData}
                                            className="ml-auto p-2 rounded-full border text-cyan-200 border-cyan-700/50 bg-[#0a1820] hover:border-cyan-400/60 transition"
                                            title="Refresh"
                                            aria-label="Refresh companies"
                                        >
                                            <motion.div
                                                initial={false}
                                                animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                                                transition={{
                                                    repeat: isRefreshing ? Infinity : 0,
                                                    repeatType: "loop",
                                                    duration: 0.6,
                                                    ease: linearCB,
                                                }}
                                            >
                                                <ArrowPathIcon className="h-5 w-5" />
                                            </motion.div>
                                        </motion.button>
                                    </motion.div>
                                </motion.div>

                                <div className="space-y-6 pb-28 sm:pb-0 relative z-0 min-h-0">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={viewMode}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.12, ease: easeOutCB }}
                                        >
                                            {Object.entries(groupedCompanies).map(([letter, companies]) =>
                                                viewMode === "grid" ? (
                                                    <section key={letter} id={letter} className="scroll-mt-24 relative z-0">
                                                        <motion.div layout="position" className="flex items-center gap-2.5 mb-2.5 mt-2.5">
                                                            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-cyan-800/30 to-teal-700/20 text-cyan-100 border border-cyan-700/40 grid place-items-center font-semibold text-sm">
                                                                {letter}
                                                            </div>
                                                            <div className="h-px flex-1 bg-gradient-to-r from-cyan-700/30 to-transparent" />
                                                        </motion.div>

                                                        {(() => {
                                                            const gridCols = showLogos ? density.gridColsLogos : density.gridColsNoLogos;
                                                            return (
                                                                <motion.div
                                                                    layout="position"
                                                                    transition={spring}
                                                                    className={`grid ${gridCols} ${density.gridGap}`}
                                                                >
                                                                    <AnimatePresence initial={false}>
                                                                        {companies.slice(0, visibleCompanyCount).map((company, idx) => {
                                                                            const tone =
                                                                                idx % 3 === 0
                                                                                    ? "from-[#0b1f29] to-[#0e2a33] border-cyan-500/30"
                                                                                    : idx % 3 === 1
                                                                                        ? "from-[#1a1b0a] to-[#232406] border-amber-500/30"
                                                                                        : "from-[#10221b] to-[#133024] border-emerald-500/30";

                                                                            return (
                                                                                <motion.div
                                                                                    key={company.id}
                                                                                    layout="position"
                                                                                    initial={{ opacity: 0, y: 8 }}
                                                                                    animate={{ opacity: 1, y: 0 }}
                                                                                    exit={{ opacity: 0, y: -6 }}
                                                                                    transition={{
                                                                                        ...fade,
                                                                                        delay: Math.min(idx, 8) * 0.012,
                                                                                    }}
                                                                                >
                                                                                    <motion.button
                                                                                        layout="position"
                                                                                        transition={spring}
                                                                                        whileHover={{ y: -2, scale: 1.002 }}
                                                                                        whileTap={{ scale: 0.99 }}
                                                                                        onClick={() => onCompanySelected?.(company)}
                                                                                        className={`group w-full text-left ${density.cardPad} ${density.radius} border bg-gradient-to-br ${tone}`}
                                                                                    >
                                                                                        <div className={`flex items-start ${showLogos ? "gap-3" : "gap-2"}`}>
                                                                                            {showLogos && (
                                                                                                <div
                                                                                                    className={`${density.logoBox} rounded-lg grid place-items-center ring-1 ring-white/5 bg-[#ffffff]`}
                                                                                                >
                                                                                                    {company.logo_url ? (
                                                                                                        <img
                                                                                                            src={`${company.logo_url}`}
                                                                                                            alt={company.company_name}
                                                                                                            className={`${density.logoImg} object-contain transition-transform duration-200 group-hover:scale-105`}
                                                                                                        />
                                                                                                    ) : null}
                                                                                                </div>
                                                                                            )}

                                                                                            <div className="flex-1 min-w-0">
                                                                                                <div
                                                                                                    className={`${density.nameSize} font-semibold text-cyan-50 whitespace-normal break-words line-clamp-2 leading-snug`}
                                                                                                >
                                                                                                    {company.company_name}
                                                                                                </div>
                                                                                                <div
                                                                                                    className={`${density.subSize} text-cyan-300/80 whitespace-normal break-words line-clamp-1`}
                                                                                                >
                                                                                                    {company.company_full}
                                                                                                </div>
                                                                                                <div className={`flex flex-wrap gap-1 ${density.chipsTop}`}>
                                                                                                    {company.domains
                                                                                                        .slice(0, density.maxChips)
                                                                                                        .map(({ domain }) => (
                                                                                                            <span
                                                                                                                key={domain}
                                                                                                                className={`px-1.5 py-0.5 ${density.chipText} rounded-full border font-medium ${getDomainStyle(
                                                                                                                    domain
                                                                                                                )}`}
                                                                                                            >
                                                                                                                {domain}
                                                                                                            </span>
                                                                                                        ))}
                                                                                                    {company.domains.length > density.maxChips && (
                                                                                                        <span
                                                                                                            className={`px-2 py-0.5 ${density.chipText} rounded-full border font-medium bg-[#0a2030] text-cyan-200 border-cyan-900/40`}
                                                                                                        >
                                                                                                            +{company.domains.length - density.maxChips} more
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </motion.button>
                                                                                </motion.div>
                                                                            );
                                                                        })}
                                                                    </AnimatePresence>

                                                                    {loadingMore &&
                                                                        visibleCompanyCount < totalFiltered &&
                                                                        Array.from({ length: compact ? 6 : 4 }).map((_, i) => (
                                                                            <SkeletonCard key={`s-${i}`} dense={compact} />
                                                                        ))}
                                                                </motion.div>
                                                            );
                                                        })()}
                                                    </section>
                                                ) : (
                                                    <section key={letter} id={letter} className="scroll-mt-24 relative z-0">
                                                        <motion.div layout="position" className="flex items-center gap-2 mb-2 mt-2">
                                                            <div className="h-6.5 w-6.5 rounded-md bg-gradient-to-br from-cyan-800/30 to-teal-700/20 text-cyan-100 border border-cyan-700/40 grid place-items-center font-semibold text-[13px]">
                                                                {letter}
                                                            </div>
                                                            <div className="h-px flex-1 bg-gradient-to-r from-cyan-700/30 to-transparent" />
                                                        </motion.div>

                                                        <motion.div layout="position" className="rounded-lg overflow-hidden">
                                                            <AnimatePresence initial={false}>
                                                                    {companies.slice(0, visibleCompanyCount).map((company, idx) => {
                                                                        const tone =
                                                                            idx % 3 === 0
                                                                                ? "from-[#0b1f29] to-[#0e2a33] border-cyan-500/30"
                                                                                : idx % 3 === 1
                                                                                    ? "from-[#1a1b0a] to-[#232406] border-amber-500/30"
                                                                                    : "from-[#10221b] to-[#133024] border-emerald-500/30";

                                                                        return (
                                                                            <motion.div
                                                                                key={company.id}
                                                                                layout="position"
                                                                                initial={{ opacity: 0, y: 8 }}
                                                                                animate={{ opacity: 1, y: 0 }}
                                                                                exit={{ opacity: 0, y: -6 }}
                                                                                transition={{ ...fade, delay: Math.min(idx, 8) * 0.012 }}
                                                                            >
                                                                                <motion.button
                                                                                    layout="position"
                                                                                    transition={spring}
                                                                                    whileHover={{ y: -2, scale: 1.002 }}
                                                                                    whileTap={{ scale: 0.99 }}
                                                                                    onClick={() => onCompanySelected?.(company)}
                                                                                    className={`group w-full text-left ${density.cardPad} ${density.radius} border bg-gradient-to-br ${tone}
          overflow-hidden isolate`}  // <- clip any overflows
                                                                                >
                                                                                    <div className={`flex items-start ${showLogos ? "gap-3" : "gap-2"}`}>
                                                                                        {showLogos && (
                                                                                            <LogoBox
                                                                                                src={company.logo_url}
                                                                                                alt={company.company_name}
                                                                                                box={density.logoBox}
                                                                                                img={density.logoImg}
                                                                                            />
                                                                                        )}

                                                                                        <div className="flex-1 min-w-0"> {/* <- allows truncation */}
                                                                                            <div className={`${density.nameSize} font-semibold text-cyan-50 break-words line-clamp-2 leading-snug`}>
                                                                                                {company.company_name}
                                                                                            </div>
                                                                                            <div className={`${density.subSize} text-cyan-300/80 truncate`}>
                                                                                                {company.company_full}
                                                                                            </div>

                                                                                            {/* Chips: wrap + per-chip truncation; never overflow */}
                                                                                            <div className={`flex flex-wrap items-center gap-1 ${density.chipsTop} overflow-hidden`}>
                                                                                                {company.domains.slice(0, density.maxChips).map(({ domain }) => (
                                                                                                    <DomainChip
                                                                                                        key={domain}
                                                                                                        text={domain}
                                                                                                        className={getDomainStyle(domain) + " " + density.chipText}
                                                                                                    />
                                                                                                ))}

                                                                                                {company.domains.length > density.maxChips && (
                                                                                                    <span
                                                                                                        className={`px-2 py-0.5 ${density.chipText} rounded-full border font-medium 
                    bg-[#0a2030] text-cyan-200 border-cyan-900/40`}
                                                                                                    >
                                                                                                        +{company.domains.length - density.maxChips} more
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </motion.button>
                                                                            </motion.div>
                                                                        );
                                                                    })}
                                                            </AnimatePresence>
                                                        </motion.div>
                                                    </section>
                                                )
                                            )}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                <div ref={sentinelRef} className="h-1" />
                            </div>

                            {/* RIGHT: placeholder column to preserve layout width (invisible) */}
                            <aside
                                aria-hidden
                                className="
                  hidden sm:block
                  sticky
                  top-[calc(var(--topbar-h,48px))-4rem]
                  self-start
                  h-[calc(100vh-var(--topbar-h,48px)-3rem)]
                  opacity-0 pointer-events-none
                "
                            >
                                <div className="h-full w-10 md:w-11" />
                            </aside>
                        </div>

                        <div
                            ref={fixedRailRef}
                            className="hidden sm:block fixed z-40"
                            style={{
                                left: railLeft,
                                top: "calc(var(--topbar-h,56px) + 0.75rem)",
                                height: "calc(100vh - var(--topbar-h,56px) - 2rem)",
                            }}
                        >
                            <LetterRail
                                activeLetters={activeLetters}
                                activeLetter={activeLetter}
                                onJump={() => {
                                    setSuppressObserver(true);
                                    setTimeout(() => setSuppressObserver(false), 400);
                                }}
                            />
                        </div>
                    </div>

                    <AnimatePresence>
                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center"
                            >
                                <motion.div
                                    initial={{ scale: 0.95 }}
                                    animate={{ scale: 1 }}
                                    transition={spring}
                                    className="h-12 w-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3"
                                />
                                <p className="text-cyan-200 text-sm">Loading Companies...</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </LayoutGroup>
        </MotionConfig>
    );
}
