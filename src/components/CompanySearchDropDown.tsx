import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/router";
import { addCompanyToRecentHistory, getRecentCompanies } from "@/utils/recentCompany";
import CompanySearchDropdownPortal from "@/portals/CompanySearchDropDownPortal";

export interface Company {
    id: number;
    company_name: string;
    company_full: string;
    logo_url?: string;
    domains: { domain: string }[];
}

export default function CompanySearchBar({
    onSelect,
    showHint = true,
    width = "max-w-2xl",
    redirectOnClick = false,
    placeholder = "Search for a company...",
    autoFocusNext = true,
    inputExpand = false
}: {
    onSelect?: (company: Company) => void;
    showHint?: boolean;
    width?: string;
    redirectOnClick?: boolean;
    placeholder?: string;
    autoFocusNext?: boolean;
    inputExpand?: boolean;

}) {
    const [search, setSearch] = useState("");
    const [allCompanies, setAllCompanies] = useState<Company[]>([]);
    const [filtered, setFiltered] = useState<Company[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [recentSelections, setRecentSelections] = useState<Company[]>([]);
    const [isResetting, setIsResetting] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const isClearingRef = useRef(false);
    const wasManuallyCleared = useRef(false);
    const inputWrapperRef = useRef<HTMLDivElement>(null);


    const router = useRouter();

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                setLoading(true);
                const res = await axios.get("/api/company");
                setAllCompanies(res.data.filter((c: Company) => c.id > 0) || []);
            } catch (err) {
                console.error("Failed to fetch companies", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCompanies();
    }, []);

    useEffect(() => {
        const loadRecent = () => {
            const companies = getRecentCompanies();
            setRecentSelections(companies);
        };

        loadRecent();

        window.addEventListener("recent-companies-updated", loadRecent);
        return () => {
            window.removeEventListener("recent-companies-updated", loadRecent);
        };
    }, [isFocused]);


    const addToRecentSelections = (company: Company) => {
        addCompanyToRecentHistory(company);
        window.dispatchEvent(new Event("recent-companies-updated"));
        setRecentSelections(getRecentCompanies());
    };

    useEffect(() => {
        if (search.trim() === "") {
            setFiltered([]);
            setShowDropdown(isFocused && recentSelections.length > 0);
        } else {
            const result = allCompanies.filter((c) =>
                (c.company_name + " " + c.company_full).toLowerCase().includes(search.toLowerCase())
            );
            setFiltered(result);
            setShowDropdown(true);
        }

    }, [search, allCompanies]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
                setFocusedIndex(-1);

                if (wasManuallyCleared.current && inputRef.current?.value === "") {
                    wasManuallyCleared.current = false;
                    inputRef.current?.blur();
                }
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const listener = (e: KeyboardEvent) => {

            const target = e.target as HTMLElement;
            const isTyping =
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable;

            if (isTyping) return;

            if ((e.ctrlKey && e.key === "k") || e.key === "/") {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", listener);
        return () => window.removeEventListener("keydown", listener);
    }, []);

    useEffect(() => {
        const handleRouteChange = () => {
            setShowDropdown(false);
            setIsFocused(false);
            setSearch("");
        };

        router.events.on("routeChangeStart", handleRouteChange);
        return () => {
            router.events.off("routeChangeStart", handleRouteChange);
        };
    }, [router]);


    const handleSelect = (company: Company) => {
        addToRecentSelections(company);

        setShowDropdown(false);
        setFocusedIndex(-1);
        setIsFocused(false);
        setSearch("");

        if (inputRef.current) {
            inputRef.current.value = "";
            inputRef.current.blur();
        }

        if (isClearingRef.current) {
            isClearingRef.current = false;
            return;
        }

        if (wasManuallyCleared.current) {
            wasManuallyCleared.current = false;
            return;
        }

        if (onSelect) onSelect(company);

        if (autoFocusNext) {
            setTimeout(() => {
                const formEls = Array.from(document.querySelectorAll<HTMLElement>(
                    'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
                )).filter(el => !el.hasAttribute("disabled") && el.tabIndex !== -1);

                const currentIndex = formEls.indexOf(document.activeElement as HTMLElement);
                if (currentIndex !== -1 && formEls[currentIndex + 1]) {
                    formEls[currentIndex + 1].focus();
                }
            }, 100);
        }
    };


    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
            inputRef.current?.blur();
            setSearch("");
            setIsFocused(false);
            setShowDropdown(false);
            setFocusedIndex(-1);

            setIsResetting(true);
            setTimeout(() => setIsResetting(false), 300);
            return;
        }

        if (!showDropdown) return;

        const results = search.trim() === "" ? recentSelections : filtered;
        if (results.length === 0) return;


        if (e.key === "ArrowDown") {
            e.preventDefault();
            setFocusedIndex((prev) => (prev + 1) % results.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setFocusedIndex((prev) => (prev - 1 + results.length) % results.length);
        } else if (e.key === "Enter" && focusedIndex >= 0) {
            e.preventDefault();
            handleSelect(results[focusedIndex]);
        }

    };

    const clearSearch = () => {
        isClearingRef.current = true;
        wasManuallyCleared.current = true;
        setSearch("");
        setShowDropdown(false);
        setFocusedIndex(-1);
        setTimeout(() => {
            inputRef.current?.focus();
        }, 10);
    };

    const resultsToShow = showDropdown
        ? (search.trim() === "" && isFocused ? recentSelections : filtered)
        : [];


    return (
        <div
            className="w-full mt-4 flex justify-center font-[Urbanist]"
            ref={dropdownRef}
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={showDropdown}
        >
            <motion.div
                ref={inputWrapperRef}
                className={`relative ${isResetting ? "animate-pulse-reset" : ""}`}
                initial={false}
                animate={{ width: inputExpand && isFocused ? "32rem" : "20rem" }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-500 absolute left-3 top-1/5 transform pointer-events-none" />

                <input
                    ref={inputRef}
                    type="text"
                    placeholder={placeholder}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                        if (isClearingRef.current) {
                            isClearingRef.current = false;
                            return;
                        }
                        setIsFocused(false);
                    }}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setFocusedIndex(-1);
                    }}
                    onKeyDown={handleKeyDown}
                    className={`w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-md 
                        focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 
                        bg-white text-gray-800 placeholder-gray-400 font-medium shadow-sm 
                        transition focus:shadow-[0_0_0_4px_rgba(0,255,255,0.1)]`}
                    aria-controls="suggestion-list"
                />

                {loading ? (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 border-2 
                                    border-cyan-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                    search.length > 0 && (
                        <XMarkIcon
                            onMouseDown={() => {
                                isClearingRef.current = true;
                            }}
                            onClick={clearSearch}
                            className="h-5 w-5 text-gray-400 hover:text-gray-600 absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
                        />
                    )
                )}


                {showHint && (
                    <div className="mt-1 text-xs italic pl-1">
                        {loading ? (
                            <span className="text-cyan-500">Fetching companies...</span>
                        ) : search.length === 0 ? (
                            <span className="text-gray-400">Try "Google" or "Amazon"</span>
                        ) : filtered.length === 0 ? (
                            <span className="text-red-400">No results found</span>
                        ) : null}
                    </div>
                )}

                <CompanySearchDropdownPortal
                    anchorEl={inputWrapperRef.current}
                    show={showDropdown}
                    results={filtered}
                    recentSelections={recentSelections}
                    focusedIndex={focusedIndex}
                    search={search}
                    onClearRecent={() => {
                        localStorage.removeItem("recent_companies");
                        setRecentSelections([]);
                        window.dispatchEvent(new Event("recent-companies-updated"));
                        setShowDropdown(false);
                    }}
                    onSelect={(company) => {
                        if (!company) return setShowDropdown(false);
                        handleSelect(company);
                    }}
                />

            </motion.div>
        </div>
    );
}
