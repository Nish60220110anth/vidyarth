import { useEffect, useMemo, useRef, useState } from "react";

// External libs
import { AnimatePresence, motion } from "framer-motion";
import { ArrowPathIcon, Bars3Icon, Squares2X2Icon } from "@heroicons/react/24/solid";

// App constants & types
import { ACCESS_PERMISSION } from "@prisma/client";
import { ALL_DOMAINS } from "./ManageCompanyList";

// Types
import type { Company } from "./CompanySearchDropDown";
import { fetchCompanyListWithPermission } from "@/lib/api/company";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";

function groupByFirstLetter(companies: Company[]): Record<string, Company[]> {
    const grouped: Record<string, Company[]> = {};

    companies.forEach((company) => {
        const firstLetter = company.company_full[0]?.toUpperCase() || "#";
        if (!grouped[firstLetter]) grouped[firstLetter] = [];
        grouped[firstLetter].push(company);
    });

    return Object.keys(grouped)
        .sort()
        .reduce((acc, key) => {
            acc[key] = grouped[key].sort((a, b) =>
                a.company_full.localeCompare(b.company_full)
            );
            return acc;
        }, {} as Record<string, Company[]>);
}

interface AllCompaniesDirectoryProps {
    onCompanySelected?: (company: Company) => void;
}

function SkeletonCard() {
    return (
        <div className="animate-pulse p-4 rounded-xl border border-gray-200 bg-white w-full">
            <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-gray-200 rounded" />
                    <div className="h-3 w-1/2 bg-gray-200 rounded" />
                    <div className="flex gap-1">
                        <div className="h-4 w-10 bg-gray-200 rounded-full" />
                        <div className="h-4 w-10 bg-gray-200 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AllCompaniesDirectory({
    onCompanySelected,
}: AllCompaniesDirectoryProps) {
    // Data
    const [allCompanies, setAllCompanies] = useState<Company[]>([]);

    // Grouping cache
    const [groupedCompanies, setGroupedCompanies] = useState<
        Record<string, Company[]>
    >({});

    // Filters & UI
    const [selectedDomain, setSelectedDomain] = useState<string>("ALL");
    const [activeLetter, setActiveLetter] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // Pagination / Infinite Scroll
    const [visibleCompanyCount, setVisibleCompanyCount] = useState(10);
    const [loadingMore, setLoadingMore] = useState(false);
    const [suppressObserver, setSuppressObserver] = useState(false);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    // Loading flags
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const { basePath } = useRouter();

    // total items after filtering/grouping (used to stop infinite scroll)
    const totalFiltered = useMemo(
        () => Object.values(groupedCompanies).reduce((n, arr) => n + arr.length, 0),
        [groupedCompanies]
    );

    useEffect(() => {
        if (!sentinelRef.current) return;

        const el = sentinelRef.current;
        const observer = new IntersectionObserver(
            async ([entry]) => {
                if (
                    !entry.isIntersecting ||
                    loadingMore ||
                    visibleCompanyCount >= totalFiltered
                )
                    return;

                setLoadingMore(true);
                await new Promise((res) => setTimeout(res, 800));
                setVisibleCompanyCount((prev) =>
                    Math.min(prev + 40, totalFiltered)
                );
                setLoadingMore(false);
            },
            {
                root: null,
                rootMargin: "0px",
                threshold: 1,
            }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [loadingMore, totalFiltered, visibleCompanyCount]);

    const fetchData = async () => {
        setIsRefreshing(true);
        try {
            const res = await fetchCompanyListWithPermission(
                ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
            );
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
                const res = await fetchCompanyListWithPermission(
                    ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
                );
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
        const observer = new IntersectionObserver(
            (entries) => {
                const visibleSections = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort(
                        (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
                    );

                if (visibleSections.length > 0 && !suppressObserver) {
                    setActiveLetter(visibleSections[0].target.id);
                }
            },
            {
                root: null,
                rootMargin: "-45% 0px -50% 0px",
                threshold: [0, 0.2, 0.8],
            }
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

    useEffect(() => {
        const filtered =
            selectedDomain === "ALL"
                ? allCompanies
                : allCompanies.filter((company) =>
                    company.domains.some((d) =>
                        (typeof d === "string" ? d : d.domain) === selectedDomain
                    )
                );

        const sorted = [...filtered].sort((a, b) =>
            a.company_full.localeCompare(b.company_full)
        );

        setGroupedCompanies(groupByFirstLetter(sorted));
        // reset pagination when filter changes
        setVisibleCompanyCount(10);
    }, [allCompanies, selectedDomain]);

    const getDomainStyle = (domain: string) => {
        const styles: Record<string, string> = {
            FINANCE:
                "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-black/5",
            MARKETING:
                "bg-rose-50    text-rose-700    border-rose-200    ring-1 ring-black/5",
            CONSULTING:
                "bg-sky-50     text-sky-700     border-sky-200     ring-1 ring-black/5",
            PRODMAN:
                "bg-violet-50  text-violet-700  border-violet-200  ring-1 ring-black/5",
            OPERATIONS:
                "bg-amber-50   text-amber-800   border-amber-200   ring-1 ring-black/5",
            GENMAN:
                "bg-teal-50    text-teal-700    border-teal-200    ring-1 ring-black/5",
        };

        return styles[domain] || "bg-gray-100 text-gray-700 border-gray-300";
    };

    const activeLetters = Object.keys(groupedCompanies).sort();

    return (
        <>
            <div className="flex md:flex-col gap-2 fixed bottom-0 md:top-1/2 md:right-4 left-0 right-0 justify-center md:justify-start md:left-auto transform md:-translate-y-1/2 bg-[#0a141d]/80 md:bg-transparent p-2 md:p-0 border-t md:border-0 z-50 overflow-x-auto no-scrollbar">
                {activeLetters.map((letter) => (
                    <a
                        key={letter}
                        href={`#${letter}`}
                        onClick={() => {
                            setSuppressObserver(true);
                            setTimeout(() => setSuppressObserver(false), 600);
                        }}
                        className={`text-xs font-medium px-2 py-1 rounded-md transition-all ${activeLetter === letter
                                ? "text-cyan-500 font-bold bg-cyan-50 md:bg-transparent"
                                : "text-gray-300 hover:text-cyan-400"
                            }`}
                    >
                        {letter}
                    </a>
                ))}
            </div>

            <div className="p-6 relative pb-8 min-h-full">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className="flex gap-2 flex-1 overflow-x-auto no-scrollbar">
                        <button
                            className={`px-2.5 sm:px-3 py-1 text-xs sm:text-sm rounded-full border whitespace-nowrap ${selectedDomain === "ALL"
                                    ? "bg-cyan-100 text-cyan-800 border-cyan-400"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                                }`}
                            onClick={() => setSelectedDomain("ALL")}
                        >
                            All
                        </button>
                        {ALL_DOMAINS.map((domain) => {
                            const tagClass =
                                getDomainStyle(domain) || getDomainStyle("Other");
                            const active = selectedDomain === domain;
                            return (
                                <button
                                    key={domain}
                                    className={`px-2.5 sm:px-3 py-1 text-xs sm:text-sm rounded-full border whitespace-nowrap transition ${active
                                            ? tagClass
                                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                                        }`}
                                    onClick={() => setSelectedDomain(domain)}
                                >
                                    {domain}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex gap-1.5 sm:gap-2 mt-1 sm:mt-0 shrink-0">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            whileHover={{ backgroundColor: "#f1f5f9" }}
                            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                            className={`group relative inline-flex items-center gap-2 px-4 py-2 text-sm rounded-full border font-medium shadow-sm transition-all duration-200
                            ${viewMode === "grid"
                                    ? "bg-white text-gray-700 hover:text-cyan-700"
                                    : "bg-cyan-100 text-cyan-800 hover:bg-cyan-200"
                                }`}
                            title={
                                viewMode === "grid"
                                    ? "Switch to List View"
                                    : "Switch to Grid View"
                            }
                        >
                            <motion.span
                                animate={{ rotate: viewMode === "grid" ? 0 : 360 }}
                                transition={{ duration: 0.5 }}
                                className="inline-flex items-center justify-center"
                            >
                                {viewMode === "list" ? (
                                    <Bars3Icon className="w-5 h-5" />
                                ) : (
                                    <Squares2X2Icon className="w-5 h-5" />
                                )}
                            </motion.span>
                            {viewMode === "grid" ? "Grid" : "List"}
                        </motion.button>

                        <button
                            onClick={fetchData}
                            className={`p-2 sm:p-2.5 rounded-full border text-gray-600 border-slate-300
              bg-white hover:bg-slate-50 hover:text-cyan-700 hover:border-cyan-400
              transition shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300`}
                            title="Refresh"
                            aria-label="Refresh companies"
                        >
                            <motion.div
                                initial={false}
                                animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                                transition={{
                                    repeat: isRefreshing ? Infinity : 0,
                                    repeatType: "loop",
                                    ease: "linear",
                                    duration: 0.5,
                                }}
                            >
                                <ArrowPathIcon className="h-4 w-4 sm:h-5 sm:w-5 text-inherit" />
                            </motion.div>
                        </button>
                    </div>
                </div>

                {Object.keys(groupedCompanies).length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center text-gray-500 italic mt-10"
                    >
                        No companies found for this domain.
                    </motion.div>
                )}

                {Object.entries(groupedCompanies).map(([letter, companies]) =>
                    viewMode === "grid" ? (
                        <div key={letter} id={letter} className="mb-8 scroll-mt-24 min-h-[120px]">
                            <h2 className="text-xl font-bold text-slate-600 mb-3 scroll-mt-24">
                                {letter}
                            </h2>

                            <motion.div
                                key={selectedDomain}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <motion.div
                                    layout
                                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                                    transition={{ staggerChildren: 0.05 }}
                                >
                                    <AnimatePresence mode="popLayout">
                                        {companies.slice(0, visibleCompanyCount).map((company, idx) => (
                                            <motion.div
                                                key={company.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ delay: idx * 0.025, duration: 0.25 }}
                                                layout
                                                whileHover={{ scale: 1.03, y: -2 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <button
                                                    onClick={() => onCompanySelected?.(company)}
                                                    className="group flex items-start gap-4 p-4 rounded-2xl bg-white/95 border border-slate-200 shadow-sm
                             hover:border-cyan-300 hover:shadow-lg transition-all duration-300 ease-out w-full transform-gpu"
                                                >
                                                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-slate-100">
                                                        {company.logo_url ? (
                                                            <img
                                                                src={`${company.logo_url}`}
                                                                alt={company.company_name}
                                                                className="h-8 w-8 object-contain"
                                                            />
                                                        ) : (
                                                            <div className="h-8 w-8 bg-slate-300 rounded-full" />
                                                        )}
                                                    </div>

                                                    <div className="text-left flex flex-col gap-1">
                                                        <p className="text-sm font-semibold text-slate-900 group-hover:text-cyan-700 transition-colors">
                                                            {company.company_name}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {company.company_full}
                                                        </p>

                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {company.domains.slice(0, 2).map(({ domain }) => (
                                                                <span
                                                                    key={domain}
                                                                    className={`px-1.5 py-0.5 text-[0.65rem] rounded-full border font-medium ring-1 ring-black/5
                                      ${getDomainStyle(domain)} break-words whitespace-normal`}
                                                                >
                                                                    {domain}
                                                                </span>
                                                            ))}

                                                            {company.domains.length > 2 && (
                                                                <span className="px-2 py-0.5 text-[0.65rem] rounded-full border font-medium bg-slate-100 text-slate-600 border-slate-300 ring-1 ring-black/5">
                                                                    +{company.domains.length - 2} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {loadingMore && visibleCompanyCount < totalFiltered && (
                                        <>
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <SkeletonCard key={`skeleton-${i}`} />
                                            ))}
                                        </>
                                    )}
                                </motion.div>
                            </motion.div>
                        </div>
                    ) : (
                        <div key={letter} id={letter} className="mb-6 scroll-mt-24 min-h-[60px]">
                            <h2 className="text-base font-semibold text-slate-500 mb-2">
                                {letter}
                            </h2>

                            <motion.div
                                layout
                                className="bg-white/95 border border-slate-200 rounded-xl overflow-hidden"
                                transition={{ staggerChildren: 0.04 }}
                            >
                                <AnimatePresence mode="popLayout">
                                    {companies.slice(0, visibleCompanyCount).map((company, idx) => (
                                        <motion.div
                                            key={company.id}
                                            layout
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -12 }}
                                            transition={{ delay: idx * 0.015, duration: 0.2 }}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <button
                                                tabIndex={0}
                                                onClick={() => onCompanySelected?.(company)}
                                                className="group w-full flex items-center px-4 py-3 bg-white/95 rounded-none
                           hover:shadow-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-400
                           transition-all duration-200 transform-gpu ring-1 ring-transparent hover:ring-cyan-300"
                                            >
                                                <div className="w-10 h-10 flex justify-center items-center bg-slate-100 rounded-full mr-4 shrink-0">
                                                    {company.logo_url ? (
                                                        <img
                                                            src={`${company.logo_url}`}
                                                            alt={company.company_name}
                                                            className="h-6 w-6 object-contain"
                                                        />
                                                    ) : (
                                                        <div className="h-6 w-6 bg-slate-300 rounded-full" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0 text-left">
                                                    <div className="text-sm font-semibold text-slate-900 truncate group-hover:text-cyan-700 transition-colors">
                                                        {company.company_name}
                                                    </div>
                                                    <div className="text-xs text-slate-500 truncate">
                                                        {company.company_full}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {company.domains.map(({ domain }) => (
                                                            <span
                                                                key={domain}
                                                                className={`px-2 py-0.5 text-[0.65rem] rounded-full border font-medium ring-1 ring-black/5 ${getDomainStyle(
                                                                    domain
                                                                )}`}
                                                            >
                                                                {domain}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        </div>
                    )
                )}

                <div ref={sentinelRef} className="h-1" />

                {isLoading && (
                    <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
                        <div className="h-16 w-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(0,255,255,0.6)] mb-4" />
                        <p className="text-cyan-200 text-lg font-medium animate-pulse">
                            Loading Companies...
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}
