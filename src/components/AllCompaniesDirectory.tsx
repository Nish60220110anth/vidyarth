import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Company } from "./CompanySearchDropDown";
import { AnimatePresence, motion } from "framer-motion";
import { ALL_DOMAINS } from "./ManageCompanyList";

function groupByFirstLetter(companies: Company[]): Record<string, Company[]> {
    const grouped: Record<string, Company[]> = {};

    companies.forEach((company) => {
        const firstLetter = company.company_full[0].toUpperCase();
        if (!grouped[firstLetter]) grouped[firstLetter] = [];
        grouped[firstLetter].push(company);
    });

    return Object.keys(grouped)
        .sort()
        .reduce((acc, key) => {
            acc[key] = grouped[key].sort((a, b) => a.company_full.localeCompare(b.company_full));
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


export default function AllCompaniesDirectory({ onCompanySelected }: AllCompaniesDirectoryProps) {

    const [allCompanies, setAllCompanies] = useState<Company[]>([])
    const [groupedCompanies, setGroupedCompanies] = useState<Record<string, Company[]>>({});
    const [selectedDomain, setSelectedDomain] = useState<string>("ALL");
    const [isLoading, setIsLoading] = useState(false);
    const [activeLetter, setActiveLetter] = useState<string | null>(null);
    const [suppressObserver, setSuppressObserver] = useState(false);
    const [visibleCompanyCount, setVisibleCompanyCount] = useState(10);
    const [loadingMore, setLoadingMore] = useState(false);
    const sentinelRef = useRef<HTMLDivElement | null>(null);



    useEffect(() => {
        setIsLoading(true);
        const t = setTimeout(() => setIsLoading(false), 600);
        return () => clearTimeout(t);
    }, [selectedDomain]);

    useEffect(() => {
        if (!sentinelRef.current || loadingMore) return;

        const observer = new IntersectionObserver(async ([entry]) => {
            if (entry.isIntersecting && !loadingMore) {
                setLoadingMore(true);
                await new Promise((res) => setTimeout(res, 800)); // artificial delay
                setVisibleCompanyCount((prev) => prev + 40);
                setLoadingMore(false);
            }
        }, {
            root: null,
            rootMargin: "0px",
            threshold: 1.0,
        });

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [loadingMore]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get("/api/company");
                setAllCompanies(res.data || []);
            } catch (error) {
                console.error("Failed to load companies", error);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visibleSections = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

                if (visibleSections.length > 0 && !suppressObserver) {
                    setActiveLetter(visibleSections[0].target.id);
                }
            },
            {
                root: null,
                rootMargin: "-45% 0px -50% 0px",
                threshold: [0, 0.2, 0.8]
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
    }, [groupedCompanies]);


    useEffect(() => {
        const filtered = selectedDomain === "ALL"
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
    }, [allCompanies, selectedDomain]);




    const getDomainStyle = (domain: string) => {
        const styles: Record<string, string> = {
            FINANCE: "bg-green-100 text-green-800 border-green-300",
            MARKETING: "bg-pink-100 text-pink-800 border-pink-300",
            CONSULTING: "bg-blue-100 text-blue-800 border-blue-300",
            PRODMAN: "bg-purple-100 text-purple-800 border-purple-300",
            OPERATIONS: "bg-yellow-100 text-yellow-800 border-yellow-300",
            GENMAN: "bg-orange-100 text-orange-800 border-orange-300",
        };

        return styles[domain] || "bg-gray-100 text-gray-700 border-gray-300";
    };

    const activeLetters = Object.keys(groupedCompanies).sort();

    return (
        <>
            <div
                className="flex md:flex-col gap-2 fixed bottom-0 md:top-1/2 md:right-4 left-0 right-0 justify-center md:justify-start md:left-auto transform md:-translate-y-1/2 bg-white/90 md:bg-transparent p-2 md:p-0 border-t md:border-0 z-50 overflow-x-auto no-scrollbar"
            >
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
                            : "text-gray-500 hover:text-cyan-400"
                            }`}
                    >
                        {letter}
                    </a>
                ))}
            </div>

            <div className="p-6">
                <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
                    <button
                        className={`px-3 py-1 text-sm rounded-full border ${selectedDomain === "ALL"
                            ? "bg-cyan-100 text-cyan-800 border-cyan-400"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"}`}
                        onClick={() => setSelectedDomain("ALL")}
                    >
                        All
                    </button>
                    {ALL_DOMAINS.map((domain) => {
                        const tagClass = getDomainStyle(domain) || getDomainStyle("Other");
                        const active = selectedDomain === domain;
                        return (
                            <button
                                key={domain}
                                className={`px-3 py-1 text-sm rounded-full border transition
                        ${active ? tagClass : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"}`}
                                onClick={() => setSelectedDomain(domain)}
                            >
                                {domain}
                            </button>
                        );
                    })}
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


                {Object.entries(groupedCompanies).map(([letter, companies]) => (
                    <div key={letter} id={letter} className="mb-8 scroll-mt-24 min-h-[120px]">
                        <h2 className="text-xl font-bold text-gray-700 mb-3 scroll-mt-24">{letter}</h2>

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
                                    {
                                        companies.slice(0, visibleCompanyCount).map((company, idx) => (
                                            <motion.div
                                                key={company.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ delay: idx * 0.025, duration: 0.25 }}
                                                layout
                                            >
                                                <button
                                                    onClick={() => onCompanySelected?.(company)}
                                                    className="group flex items-start gap-4 p-4 rounded-xl border border-gray-200 bg-white 
                                    hover:shadow-[0_4px_20px_rgba(0,255,255,0.2)] hover:border-cyan-400 
                                    transition-all duration-300 ease-in-out w-full transform hover:-translate-y-1"
                                                >
                                                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                                                        {company.logo_url ? (
                                                            <img
                                                                src={company.logo_url}
                                                                alt={company.company_name}
                                                                className="h-8 w-8 object-contain"
                                                            />
                                                        ) : (
                                                            <div className="h-8 w-8 bg-gray-300 rounded-full" />
                                                        )}
                                                    </div>

                                                    <div className="text-left flex flex-col gap-1">
                                                        <p className="text-sm font-semibold text-gray-800 group-hover:text-cyan-600 transition-all">
                                                            {company.company_name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{company.company_full}</p>

                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {company.domains.slice(0, 2).map(({ domain }) => (
                                                                <span
                                                                    key={domain}
                                                                    className={`px-1 py-0.5 text-[0.65rem] rounded-full border font-medium ${getDomainStyle(domain)} break-words whitespace-normal`}
                                                                >
                                                                    {domain}
                                                                </span>
                                                            ))}

                                                            {company.domains.length > 2 && (
                                                                <span className="px-2 py-0.5 text-[0.65rem] rounded-full border font-medium bg-gray-100 text-gray-600 border-gray-300">
                                                                    +{company.domains.length - 2} more
                                                                </span>
                                                            )}
                                                        </div>

                                                    </div>
                                                </button>
                                            </motion.div>
                                        ))}
                                </AnimatePresence>

                                {loadingMore && (
                                    <>
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <SkeletonCard key={`skeleton-${i}`} />
                                        ))}
                                    </>
                                )}

                                <div ref={sentinelRef} className="h-1 col-span-full" />

                            </motion.div>

                        </motion.div>
                    </div>
                ))}
            </div>
        </>
    );
}
