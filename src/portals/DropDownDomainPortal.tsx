// portals/ProfileDropdownPortal.tsx
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import React, { useEffect, useRef } from "react";

export default function ProfileDropdownPortal({
    anchorEl,
    show,
    onClose,
    children,
}: {
    anchorEl: HTMLElement | null;
    show: boolean;
    onClose: () => void;
    children: React.ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                ref.current &&
                !ref.current.contains(e.target as Node) &&
                anchorEl &&
                !anchorEl.contains(e.target as Node)
            ) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [anchorEl, onClose]);

    if (!show || !anchorEl) return null;

    const rect = anchorEl.getBoundingClientRect();

    const style = {
        position: "absolute" as const,
        top: `${rect.bottom + window.scrollY + 10}px`,
        left: `${rect.right - 208 + window.scrollX}px`, // 208px is width
        zIndex: 9999,
    };

    return createPortal(
        <motion.div
            ref={ref}
            style={style}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="w-52 rounded-lg shadow-xl border border-blue-900 bg-blue-950"
        >
            {children}
        </motion.div>,
        document.body
    );
}
