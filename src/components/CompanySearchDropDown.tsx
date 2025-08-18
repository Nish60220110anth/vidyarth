import { useCallback, useEffect, useId, useMemo, useRef, useState, useDeferredValue } from "react";
import { useRouter } from "next/router";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import { ACCESS_PERMISSION } from "@prisma/client";

import { fetchCompanyListWithPermission } from "@/lib/api/company";
import CompanySearchDropdownPortal from "@/portals/CompanySearchDropDownPortal";
import { addCompanyToRecentHistory, getRecentCompanies } from "@/utils/recentCompany";

export interface Company {
    id: number;
    company_name: string;
    company_full: string;
    logo_url?: string;
    domains: { domain: string }[];
    is_featured: boolean;
    is_legacy: boolean;
}

type Props = {
    onSelect?: (company: Company) => void;
    showHint?: boolean;
    placeholder?: string;
    autoFocusNext?: boolean;
    inputExpand?: boolean;
    permission: ACCESS_PERMISSION; // << strong typing
};

export default function CompanySearchBar({
    onSelect,
    showHint = true,
    placeholder = "Search for a company...",
    autoFocusNext = true,
    inputExpand = false,
    permission,
}: Props) {
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);

    const [allCompanies, setAllCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [recentSelections, setRecentSelections] = useState<Company[]>([]);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [isResetting, setIsResetting] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const inputWrapperRef = useRef<HTMLDivElement>(null);
    const isClearingRef = useRef(false);
    const wasManuallyCleared = useRef(false);
    const isComposingRef = useRef(false);

    const router = useRouter();
    const listboxId = useId();

    // Fetch companies (include permission in deps; guard unmount)
    useEffect(() => {
        let active = true;
        const run = async () => {
            try {
                setLoading(true);
                const res = await fetchCompanyListWithPermission(permission);
                if (res.success && active) {
                    if (active) setAllCompanies(res.data ?? []);
                }
            } catch {
                if (active) setAllCompanies([]);
            } finally {
                if (active) setLoading(false);
            }
        };
        run();
        return () => {
            active = false;
        };
    }, [permission]);

    // Load & subscribe to recent selections (client only)
    useEffect(() => {
        if (typeof window === "undefined") return;

        const loadRecent = () => {
            try {
                const companies = getRecentCompanies();
                setRecentSelections(companies);
            } catch {
                setRecentSelections([]);
            }
        };

        loadRecent();
        window.addEventListener("recent-companies-updated", loadRecent);
        return () => window.removeEventListener("recent-companies-updated", loadRecent);
    }, [isFocused]);

    const addToRecentSelections = useCallback((company: Company) => {
        addCompanyToRecentHistory(company);
        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("recent-companies-updated"));
        }
    }, []);

    // Precompute normalized haystacks once per dataset
    const normalized = useMemo(
        () =>
            allCompanies.map((c) => ({
                company: c,
                haystack: (c.company_name + " " + c.company_full).toLowerCase(),
            })),
        [allCompanies]
    );

    // Fast, multi-word filtering with capped results; uses deferred search
    const filtered = useMemo(() => {
        const q = deferredSearch.trim().toLowerCase();
        if (!q) return [] as Company[];

        const words = q.split(/\s+/).filter(Boolean);
        const out: Company[] = [];
        for (const item of normalized) {
            const ok = words.every((w) => item.haystack.includes(w));
            if (ok) {
                out.push(item.company);
                if (out.length >= 50) break; // cap results for perf
            }
        }
        return out;
    }, [deferredSearch, normalized]);

    // Derived: showDropdown
    const showDropdown = isFocused && (deferredSearch.trim() !== "" || recentSelections.length > 0);

    // Click outside to close index highlight (keep field state sane)
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (dropdownRef.current && !dropdownRef.current.contains(target)) {
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

    // Global shortcut: Ctrl+K or "/"
    useEffect(() => {
        const listener = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isTyping =
                target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
            if (isTyping) return;
            if ((e.ctrlKey && e.key === "k") || e.key === "/") {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", listener);
        return () => window.removeEventListener("keydown", listener);
    }, []);

    // Close on route change
    useEffect(() => {
        const handleRouteChange = () => {
            setIsFocused(false);
            setFocusedIndex(-1);
            setSearch("");
        };
        router.events.on("routeChangeStart", handleRouteChange);
        return () => {
            router.events.off("routeChangeStart", handleRouteChange);
        };
    }, [router.events]);

    const handleSelect = useCallback(
        (company: Company) => {
            addToRecentSelections(company);

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

            onSelect?.(company);

            if (autoFocusNext) {
                setTimeout(() => {
                    const formEls = Array.from(
                        document.querySelectorAll<HTMLElement>(
                            'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
                        )
                    ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);

                    const currentIndex = formEls.indexOf(document.activeElement as HTMLElement);
                    if (currentIndex !== -1 && formEls[currentIndex + 1]) {
                        formEls[currentIndex + 1].focus();
                    }
                }, 100);
            }
        },
        [addToRecentSelections, onSelect, autoFocusNext]
    );

    const clearSearch = useCallback(() => {
        isClearingRef.current = true;
        wasManuallyCleared.current = true;
        setSearch("");
        setFocusedIndex(-1);
        setTimeout(() => inputRef.current?.focus(), 10);
    }, []);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Escape") {
                inputRef.current?.blur();
                setSearch("");
                setIsFocused(false);
                setFocusedIndex(-1);
                setIsResetting(true);
                setTimeout(() => setIsResetting(false), 300);
                return;
            }

            if (!showDropdown) return;

            const results = deferredSearch.trim() === "" ? recentSelections : filtered;
            if (results.length === 0) return;

            // IME composition: ignore arrows/enter while composing
            if (isComposingRef.current) return;

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setFocusedIndex((prev) => (prev + 1) % results.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setFocusedIndex((prev) => (prev - 1 + results.length) % results.length);
            } else if (e.key === "Home") {
                e.preventDefault();
                setFocusedIndex(0);
            } else if (e.key === "End") {
                e.preventDefault();
                setFocusedIndex(results.length - 1);
            } else if (e.key === "Enter" && focusedIndex >= 0) {
                e.preventDefault();
                handleSelect(results[focusedIndex]);
            }
        },
        [showDropdown, deferredSearch, recentSelections, filtered, focusedIndex, handleSelect]
    );

    return (
        <div
            className="w-full mt-4 px-3 sm:px-0 flex justify-center font-[Urbanist]"
            ref={dropdownRef}
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-autocomplete="list"
        >
            <motion.div
                ref={inputWrapperRef}
                className={`relative ${isResetting ? "animate-pulse-reset" : ""} w-full`}
                // Mobile-first responsive width; animates between compact/expanded but never exceeds viewport
                style={{
                    width: inputExpand && isFocused ? "min(32rem, 92vw)" : "min(20rem, 92vw)",
                }}
                initial={false}
                animate={{ opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
                <MagnifyingGlassIcon
                    className="h-5 w-5 text-gray-500 absolute left-3 inset-y-0 my-auto pointer-events-none"
                    aria-hidden="true"
                />

                <input
                    ref={inputRef}
                    type="text"
                    placeholder={placeholder}
                    onCompositionStart={() => (isComposingRef.current = true)}
                    onCompositionEnd={() => (isComposingRef.current = false)}
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
                    aria-busy={loading}
                    className={`w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-md 
            focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 
            bg-white text-gray-800 placeholder-gray-400 font-medium shadow-sm 
            transition focus:shadow-[0_0_0_4px_rgba(0,255,255,0.1)]`}
                    aria-activedescendant={
                        focusedIndex >= 0 ? `${listboxId}-option-${focusedIndex}` : undefined
                    }
                />

                {loading ? (
                    // Loading ring: perfectly centered vertically on all sizes
                    <div
                        className="absolute right-3 inset-y-0 my-auto h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"
                        aria-label="Loading"
                    />
                ) : (
                    search.length > 0 && (
                        <XMarkIcon
                            onMouseDown={() => {
                                isClearingRef.current = true;
                            }}
                            onClick={clearSearch}
                            className="h-5 w-5 text-gray-400 hover:text-gray-600 absolute right-3 inset-y-0 my-auto cursor-pointer"
                            aria-label="Clear search"
                        />
                    )
                )}

                {showHint && (
                    <div className="mt-1 text-[11px] sm:text-xs italic pl-1">
                        {loading ? (
                            <span className="text-cyan-500">Fetching companies...</span>
                        ) : deferredSearch.length === 0 ? (
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
                    search={deferredSearch}
                    listboxId={listboxId as unknown as string}
                    onClearRecent={() => {
                        if (typeof window !== "undefined") {
                            localStorage.removeItem("recent_companies");
                            setRecentSelections([]);
                            window.dispatchEvent(new Event("recent-companies-updated"));
                        }
                    }}
                    onSelect={(company) => {
                        if (!company) return;
                        handleSelect(company);
                    }}
                />
            </motion.div>
        </div>
    );
}
