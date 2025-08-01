// components/CompanySearchDropdownPortal.tsx
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Company } from "@/components/CompanySearchDropDown";

interface Props {
    anchorEl: HTMLElement | null;
    show: boolean;
    results: Company[];
    recentSelections: Company[];
    focusedIndex: number;
    search: string;
    listboxId: string; // << new prop
    onSelect: (company: Company | null) => void; // accept null to close
    onClearRecent: () => void;
    // Optional: cap height or customize classes if needed
    maxHeightPx?: number;
    className?: string;
}

export default function CompanySearchDropdownPortal({
    anchorEl,
    show,
    results,
    recentSelections,
    focusedIndex,
    search,
    listboxId,
    onSelect,
    onClearRecent,
    maxHeightPx = 250,
    className,
}: Props) {
    const portalRef = useRef<HTMLUListElement>(null);
    const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rafId = useRef<number | null>(null);
    const [mounted, setMounted] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number }>({
        top: 0,
        left: 0,
        width: 0,
    });

    // Client-only mount guard (SSR-safe)
    useEffect(() => {
        setMounted(true);
    }, []);

    // Compute which list to render
    const showingRecents = search.trim() === "" && recentSelections.length > 0;
    const resultsToShow = showingRecents ? recentSelections : results;

    // Positioning: fixed to viewport; update on anchor resize/scroll/resize
    useEffect(() => {
        if (!anchorEl || !mounted) return;

        const updatePosition = () => {
            if (!anchorEl) return;
            const rect = anchorEl.getBoundingClientRect();
            // Fixed positioning avoids scrollX/scrollY math and reflow issues
            setDropdownStyle({
                top: rect.bottom,
                left: rect.left,
                width: rect.width,
            });
        };

        // RAF-throttled listeners
        const schedule = () => {
            if (rafId.current != null) return;
            rafId.current = window.requestAnimationFrame(() => {
                rafId.current = null;
                updatePosition();
            });
        };

        updatePosition();

        const ro = new ResizeObserver(schedule);
        ro.observe(anchorEl);

        window.addEventListener("scroll", schedule, true);
        window.addEventListener("resize", schedule);

        return () => {
            ro.disconnect();
            window.removeEventListener("scroll", schedule, true);
            window.removeEventListener("resize", schedule);
            if (rafId.current != null) {
                cancelAnimationFrame(rafId.current);
                rafId.current = null;
            }
        };
    }, [anchorEl, mounted]);

    // Close on outside click
    useEffect(() => {
        if (!mounted) return;

        const handleOutsideClick = (e: MouseEvent) => {
            const target = e.target as Node;
            const portal = portalRef.current;
            if (!portal) return;
            const clickedOutsidePortal = !portal.contains(target);
            const clickedOutsideAnchor = anchorEl ? !anchorEl.contains(target) : true;

            if (clickedOutsidePortal && clickedOutsideAnchor) {
                onSelect(null);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [anchorEl, onSelect, mounted]);

    // Keep focused option in view
    useLayoutEffect(() => {
        if (!portalRef.current || focusedIndex < 0) return;
        const el = portalRef.current.querySelector<HTMLElement>(
            `#${CSS.escape(listboxId)}-option-${focusedIndex}`
        );
        if (el) {
            el.scrollIntoView({ block: "nearest" });
        }
    }, [focusedIndex, listboxId, resultsToShow.length]);

    // Clean up hover timeout
    useEffect(() => {
        return () => {
            if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        };
    }, []);

    if (!mounted || !show || !anchorEl) return null;

    const containerStyle: React.CSSProperties = {
        position: "fixed",
        top: dropdownStyle.top,
        left: dropdownStyle.left,
        width: dropdownStyle.width,
        zIndex: 9999,
    };

    return createPortal(
        <AnimatePresence>
            {show && (
                <motion.ul
                    ref={portalRef}
                    id={listboxId}
                    role="listbox"
                    aria-label="Company suggestions"
                    style={containerStyle}
                    onMouseEnter={() => {
                        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                    }}
                    onMouseLeave={() => {
                        // Small delay to prevent accidental close when moving pointer
                        hoverTimeout.current = setTimeout(() => onSelect(null), 120);
                    }}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.18 }}
                    className={
                        className ??
                        `border border-gray-300 rounded-md shadow-md z-[9999]
             max-h-[${maxHeightPx}px] overflow-y-auto text-gray-800 bg-white`
                    }
                >
                    {showingRecents && (
                        <li
                            className="px-4 py-2 text-xs font-semibold text-gray-600 sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200"
                            aria-hidden="true"
                        >
                            Recent Selections
                        </li>
                    )}

                    {resultsToShow.length === 0 ? (
                        <li className="px-4 py-2 text-xs text-gray-400 italic" aria-live="polite">
                            {search ? "No companies found." : "No recent selections."}
                        </li>
                    ) : (
                        resultsToShow.map((company, idx) => {
                            const isActive = focusedIndex === idx;
                            const optionId = `${listboxId}-option-${idx}`;
                            return (
                                <li
                                    key={company.id}
                                    id={optionId}
                                    role="option"
                                    aria-selected={isActive}
                                    onMouseDown={(e) => {
                                        // Prevent input blur race conditions
                                        e.preventDefault();
                                        onSelect(company);
                                    }}
                                    className={`flex items-center px-4 py-2 text-sm cursor-pointer gap-3 border-l-2 transition-all duration-200
                              transform hover:translate-x-1 hover:shadow-sm ${isActive
                                            ? "bg-cyan-50 border-cyan-500 text-cyan-800"
                                            : "hover:bg-gray-50 border-transparent"
                                        }`}
                                >
                                    {company.logo_url ? (
                                        <img
                                            src={company.logo_url}
                                            alt={company.company_name}
                                            className="h-6 w-6 object-contain"
                                        />
                                    ) : (
                                        <div className="h-6 w-6 bg-gray-300 rounded-full" aria-hidden="true" />
                                    )}
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-900">{company.company_full}</span>
                                        <span className="text-xs text-gray-500">{company.company_name}</span>
                                    </div>
                                </li>
                            );
                        })
                    )}

                    {showingRecents && (
                        <li
                            className="px-4 py-2 text-xs text-red-500 cursor-pointer hover:bg-red-50"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                                onClearRecent();
                            }}
                        >
                            Clear Recent Selections
                        </li>
                    )}
                </motion.ul>
            )}
        </AnimatePresence>,
        document.body
    );
}
