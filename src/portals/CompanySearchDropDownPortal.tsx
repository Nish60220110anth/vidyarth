// components/CompanySearchDropdownPortal.tsx
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Company } from "@/components/CompanySearchDropDown";

interface Props {
    anchorEl: HTMLElement | null;
    show: boolean;
    results: Company[];
    recentSelections: Company[];
    focusedIndex: number;
    search: string;
    onSelect: (company: Company) => void;
    onClearRecent: () => void;
}

export default function CompanySearchDropdownPortal({
    anchorEl,
    show,
    results,
    recentSelections,
    focusedIndex,
    search,
    onSelect,
    onClearRecent,
}: Props) {

    const portalRef = useRef<HTMLUListElement>(null);
    const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
    const [dropdownStyle, setDropdownStyle] = useState({
        top: 0,
        left: 0,
        width: 0,
      });

    useEffect(() => {
        if (!anchorEl) return;

        const updatePosition = () => {
            const rect = anchorEl.getBoundingClientRect();
            setDropdownStyle({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
            });
        };

        updatePosition();

        const resizeObserver = new ResizeObserver(updatePosition);
        resizeObserver.observe(anchorEl);

        window.addEventListener("scroll", updatePosition, true); // handle scroll

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [anchorEl]);


    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (
                portalRef.current &&
                !portalRef.current.contains(e.target as Node) &&
                anchorEl &&
                !anchorEl.contains(e.target as Node)
            ) {

                hoverTimeout.current = setTimeout(() => {
                    onSelect(null as any);
                }, 100);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            // if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        };
    }, [anchorEl, onSelect]);


    if (!show || !anchorEl) return null;

    const style = {
        position: "absolute" as const,
        top: dropdownStyle.top,
        left: dropdownStyle.left,
        width: dropdownStyle.width,
        zIndex: 9999,
    };
    
    const resultsToShow =
        search.trim() === "" && recentSelections.length > 0
            ? recentSelections
            : results;

    return createPortal(
        <AnimatePresence>
            {show && (
                <motion.ul
                    ref={portalRef}
                    onMouseEnter={() => {
                        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                    }}
                    onMouseLeave={() => {
                        hoverTimeout.current = setTimeout(() => {
                            onSelect(null as any);
                        }, 100);
                    }}

                    style={style}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.2 }}
                    className="border border-gray-300 rounded-md shadow-md z-[9999] 
          max-h-[250px] overflow-y-auto text-gray-800 bg-white"
                >
                    {search.trim() === "" && recentSelections.length > 0 && (
                        <li className="px-4 py-2 text-xs font-semibold text-gray-600 sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
                            Recent Selections
                        </li>
                    )}

                    {resultsToShow.length === 0 ? (
                        <li className="px-4 py-2 text-xs text-gray-400 italic">
                            {search ? "No companies found." : "No recent selections."}
                        </li>
                    ) : (
                        resultsToShow.map((company, idx) => (
                            <li
                                key={company.id}
                                role="option"
                                aria-selected={focusedIndex === idx}
                                onMouseDown={() => onSelect(company)}
                                className={`flex items-center px-4 py-2 text-sm cursor-pointer gap-3 border-l-2 transition-all duration-200
                transform hover:translate-x-1 hover:shadow-sm
                ${focusedIndex === idx
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
                                    <div className="h-6 w-6 bg-gray-300 rounded-full" />
                                )}
                                <div className="flex flex-col">
                                    <span className="font-medium text-gray-900">
                                        {company.company_full}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {company.company_name}
                                    </span>
                                </div>
                            </li>
                        ))
                    )}

                    {search.trim() === "" && recentSelections.length > 0 && (
                        <li
                            className="px-4 py-2 text-xs text-red-500 cursor-pointer hover:bg-red-50"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                                onClearRecent();

                                console.log("Recent history cleared")
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
