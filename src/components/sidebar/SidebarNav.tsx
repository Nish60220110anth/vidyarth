import { JSX, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { TooltipWrapper } from "../TooltipWrapper";

interface SidebarNavProps {
    collapsed: boolean;
    groupedItems: Record<
        string,
        {
            label: string;
            icon: (cls: string) => JSX.Element;
            component: () => JSX.Element;
            key: string;
            shortcut: string;
            _label: string;
        }[]
    >;
    activeKey: string | null;
    onItemClick: (key: string) => void;
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function SidebarNav({
    collapsed,
    groupedItems,
    activeKey,
    onItemClick,
}: SidebarNavProps) {
    const prefersReducedMotion = useReducedMotion();
    const sections = useMemo(() => Object.entries(groupedItems), [groupedItems]);

    // container + item variants (very light)
    const containerVariants = {
        hidden: {},
        show: {
            transition: { staggerChildren: 0.035, delayChildren: 0.05 },
        },
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 6 },
        show: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.18, ease: EASE },
        },
    };

    return (
        <motion.nav
            role="navigation"
            aria-label="Primary"
            className="
        flex-1 overflow-y-auto mt-2 md:mt-4
        px-1 md:px-0
        scroll-smooth overscroll-contain
      "
            variants={containerVariants}
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? undefined : "show"}
            layout
            layoutScroll
        >
            {sections.map(([section, items]) => (
                <motion.div key={section} className="mb-3 md:mb-4" layout>
                    {/* Section title */}
                    <AnimatePresence initial={false}>
                        {!collapsed && section !== "_generic" && (
                            <motion.div
                                key={`${section}-title`}
                                className="px-3 md:px-4 text-[10px] md:text-xs font-bold uppercase text-gray-400 mb-1.5 md:mb-2"
                                initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }}
                                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                                transition={{ duration: 0.16, ease: EASE }}
                            >
                                {section}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Items */}
                    <div className="space-y-1.5 md:space-y-2">
                        {items.map(({ label, icon, key, shortcut, _label }) => {
                            const isActive = activeKey === key;

                            return (
                                <TooltipWrapper keyChar={shortcut} label={label} key={label}>
                                    <motion.div
                                        role="button"
                                        tabIndex={0}
                                        layout
                                        variants={itemVariants}
                                        whileHover={
                                            prefersReducedMotion ? undefined : { x: 2 }
                                        }
                                        whileTap={
                                            prefersReducedMotion ? undefined : { scale: 0.99 }
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") onItemClick(key);
                                        }}
                                        onClick={() => onItemClick(key)}
                                        aria-current={isActive ? "page" : undefined}
                                        className={`
                      relative isolate
                      flex items-center justify-between
                      py-2.5 md:py-3
                      pr-3 md:pr-4
                      ${isActive ? "pl-2" : "pl-3 md:pl-4"}
                      mx-1.5 md:mx-2
                      rounded-lg text-sm font-semibold
                      select-none
                      transition-all duration-200 cursor-pointer
                      min-h-[42px]
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700/50
                      ${isActive ? "text-cyan-400" : "text-cyan-100 hover:bg-white/10"}
                    `}
                                    >
                                        {/* Active pill background (shared layoutId for butter-smooth move) */}
                                        <AnimatePresence>
                                            {isActive && (
                                                <motion.span
                                                    layoutId="nav-active-pill"
                                                    className="absolute inset-0 rounded-lg bg-white/10"
                                                    initial={prefersReducedMotion ? false : { opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.18, ease: EASE }}
                                                />
                                            )}
                                        </AnimatePresence>

                                        {/* Active left bar */}
                                        <AnimatePresence>
                                            {isActive && (
                                                <motion.span
                                                    layoutId="nav-active-bar"
                                                    className="absolute left-0 top-1/2 -translate-y-1/2 h-[70%] w-1.5 rounded-r bg-cyan-400"
                                                    initial={prefersReducedMotion ? false : { scaleY: 0.6, opacity: 0 }}
                                                    animate={{ scaleY: 1, opacity: 1 }}
                                                    exit={{ scaleY: 0.6, opacity: 0 }}
                                                    transition={{ duration: 0.2, ease: EASE }}
                                                />
                                            )}
                                        </AnimatePresence>

                                        {/* Content */}
                                        <div className="relative z-[1] flex items-center gap-3 md:gap-4 min-w-0">
                                            {icon(
                                                `h-5 w-5 shrink-0 transition-transform ${isActive ? "scale-[1.05]" : "group-hover:scale-[1.05]"
                                                }`
                                            )}
                                            <AnimatePresence initial={false}>
                                                {!collapsed && (
                                                    <motion.span
                                                        key={`${label}-text`}
                                                        className="text-sm truncate"
                                                        initial={prefersReducedMotion ? false : { opacity: 0, x: -4 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -4 }}
                                                        transition={{ duration: 0.15, ease: EASE }}
                                                    >
                                                        {_label.toLocaleUpperCase()}
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Shortcut badge */}
                                        <AnimatePresence initial={false}>
                                            {!collapsed && shortcut && (
                                                <motion.span
                                                    key={`${label}-sc`}
                                                    className="relative z-[1] ml-2 bg-white/20 text-[0.60rem] md:text-[0.65rem] px-1.5 md:px-2 py-0.5 rounded-md text-white shrink-0"
                                                    initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -4 }}
                                                    transition={{ duration: 0.12, ease: EASE }}
                                                >
                                                    {shortcut}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                </TooltipWrapper>
                            );
                        })}
                    </div>
                </motion.div>
            ))}
        </motion.nav>
    );
}
