import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
    SpeakerWaveIcon,
    UserCircleIcon,
    ArrowPathIcon,
    Bars3Icon,
} from "@heroicons/react/24/outline";
import CompanySearchBar from "../CompanySearchDropDown";
import { ACCESS_PERMISSION } from "@prisma/client";
import toast from "react-hot-toast";
import ProfileDropdownPortal from "@/portals/DropDownDomainPortal";
import { useRouter } from "next/router";
import {
    JSX,
    useCallback,
    useMemo,
    useRef,
    useState,
    useLayoutEffect,
    useEffect,
} from "react";
import { onRouteTo } from "@/utils/urlClick";
import axios, { AxiosResponse } from "axios";
import { useAuth } from "@/contexts/AuthContext";
import SidebarHeader from "./SidebarHeader";

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

interface SidebarTopBarProps {
    permissions: Record<string, boolean>;
    profile_dropdown_items: Record<string, any>;
    showProfileMenu: boolean;
    setShowProfileMenu: React.Dispatch<React.SetStateAction<boolean>>;
    highlightedIndex: number | null;
    setHighlightedIndex: (index: number | null) => void;
    showAnnouncements: boolean;
    setShowAnnouncements: React.Dispatch<React.SetStateAction<boolean>>;
    announcements: any[];
    setAnnouncements: (a: any[]) => void;
    announcementIconRef: React.RefObject<HTMLElement | null>;
    profileButtonRef: React.RefObject<HTMLElement | null>;
    setActiveComponent: (component: JSX.Element) => void;

    // integrate SidebarHeader here + mobile drawer
    collapsed: boolean;
    toggleSidebar: () => void;
    onMobileToggle: () => void;
    mobileOpen: boolean;
}

const EASE = [0.16, 1, 0.3, 1] as const;

export default function SidebarTopBar({
    permissions,
    profile_dropdown_items,
    showProfileMenu,
    setShowProfileMenu,
    highlightedIndex,
    setHighlightedIndex,
    showAnnouncements,
    setShowAnnouncements,
    announcements,
    setAnnouncements,
    announcementIconRef,
    profileButtonRef,
    setActiveComponent,
    collapsed,
    toggleSidebar,
    onMobileToggle,
}: SidebarTopBarProps) {
    const router = useRouter();
    const { basePath } = router;
    const prefersReducedMotion = useReducedMotion();

    const profileMenuRef = useRef<HTMLDivElement>(null);
    const topbarRef = useRef<HTMLDivElement>(null);
    const announcePanelRef = useRef<HTMLDivElement>(null);

    const [loadingAnns, setLoadingAnns] = useState(false);
    const [refreshingAnns, setRefreshingAnns] = useState(false);
    const lastFetchedRef = useRef(0);
    const inFlightRef = useRef<AbortController | null>(null);
    const { user } = useAuth();

    // Topbar elevation on page scroll
    const [elevated, setElevated] = useState(false);
    useEffect(() => {
        const onScroll = () => setElevated(window.scrollY > 0);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Route progress bar
    const [routeLoading, setRouteLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const progTimer = useRef<number | null>(null);

    const startProgress = () => {
        if (progTimer.current) window.clearInterval(progTimer.current);
        setRouteLoading(true);
        setProgress(8);
        progTimer.current = window.setInterval(() => {
            setProgress((p) => (p < 85 ? p + Math.random() * 7 : p));
        }, 200) as unknown as number;
    };
    const finishProgress = () => {
        if (progTimer.current) window.clearInterval(progTimer.current);
        setProgress(100);
        setTimeout(() => {
            setRouteLoading(false);
            setProgress(0);
        }, 250);
    };
    useEffect(() => {
        const onStart = () => startProgress();
        const onDone = () => finishProgress();
        router.events.on("routeChangeStart", onStart);
        router.events.on("routeChangeComplete", onDone);
        router.events.on("routeChangeError", onDone);
        return () => {
            router.events.off("routeChangeStart", onStart);
            router.events.off("routeChangeComplete", onDone);
            router.events.off("routeChangeError", onDone);
            if (progTimer.current) window.clearInterval(progTimer.current);
        };
    }, [router.events]);

    // Fixed-position coordinates for announcements popover
    const DROPDOWN_W = 352; // 22rem
    const [annPos, setAnnPos] = useState<{ top: number; left: number } | null>(null);
    const positionAnnouncements = useCallback(() => {
        const el = announcementIconRef?.current as HTMLElement | null;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const gap = 8;
        let left = rect.right - DROPDOWN_W; // align right
        left = Math.min(left, window.innerWidth - DROPDOWN_W - 12);
        left = Math.max(12, left);
        const top = rect.bottom + gap;
        setAnnPos({ top, left });
    }, [announcementIconRef]);

    useLayoutEffect(() => {
        if (!showAnnouncements) return;
        positionAnnouncements();
        const reflow = () => positionAnnouncements();
        window.addEventListener("resize", reflow);
        window.addEventListener("scroll", reflow, true);
        return () => {
            window.removeEventListener("resize", reflow);
            window.removeEventListener("scroll", reflow, true);
        };
    }, [showAnnouncements, positionAnnouncements]);

    // Click outside & ESC to close popovers
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setShowAnnouncements(false);
                setShowProfileMenu(false);
            }
            if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
                // focus search
                const root = topbarRef.current;
                if (!root) return;
                const input = root.querySelector("input") as HTMLInputElement | null;
                if (input) {
                    e.preventDefault();
                    input.focus();
                    input.select?.();
                }
            }
        };
        const onClick = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                showAnnouncements &&
                announcePanelRef.current &&
                !announcePanelRef.current.contains(target) &&
                !(announcementIconRef.current as any)?.contains?.(target)
            ) {
                setShowAnnouncements(false);
            }
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener("mousedown", onClick, true);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("mousedown", onClick, true);
        };
    }, [showAnnouncements, setShowAnnouncements, setShowProfileMenu, announcementIconRef]);

    const MAX_ANNOUNCEMENTS = 6;

    const unwrap = <T,>(res: AxiosResponse<ApiResponse<T>>): T => {
        if (res?.data?.success) return res.data.data as T;
        throw new Error(res?.data?.error || `HTTP ${res?.status}`);
    };
    const getErr = (e: any) => e?.response?.data?.error || e?.message || "Something went wrong";

    const canSeeAnnouncements = permissions[ACCESS_PERMISSION.ENABLE_ANNOUNCEMENTS];

    const fetchAnnouncements = useCallback(
        async (force = false) => {
            if (!canSeeAnnouncements || !user?.id) return;
            const recent = Date.now() - lastFetchedRef.current < 60_000 && announcements.length > 0;
            if (!force && recent) return;
            try {
                inFlightRef.current?.abort();
                const ac = new AbortController();
                inFlightRef.current = ac;
                setLoadingAnns(true);
                const res = await axios.get<ApiResponse<any[]>>(
                    `${basePath}/api/announcements/?userId=${user?.id}&take=${MAX_ANNOUNCEMENTS}`,
                    {
                        signal: ac.signal,
                        headers: { "x-access-permission": ACCESS_PERMISSION.ENABLE_ANNOUNCEMENTS },
                    }
                );
                const data = unwrap<any[]>(res) || [];
                setAnnouncements(data);
                lastFetchedRef.current = Date.now();
            } catch (e) {
                toast.error(getErr(e));
                setAnnouncements([]);
            } finally {
                setLoadingAnns(false);
            }
        },
        [basePath, canSeeAnnouncements, announcements.length, setAnnouncements, user?.id]
    );

    const onToggleAnnouncements = useCallback(async () => {
        const next = !showAnnouncements;
        setShowAnnouncements(next);
        if (next) await fetchAnnouncements(false);
    }, [showAnnouncements, setShowAnnouncements, fetchAnnouncements]);

    const onRefreshAnnouncements = useCallback(async () => {
        try {
            setRefreshingAnns(true);
            await fetchAnnouncements(true);
            toast.success("Refreshed");
        } finally {
            setRefreshingAnns(false);
        }
    }, [fetchAnnouncements]);

    const visibleMenuItems = useMemo(
        () => Object.entries(profile_dropdown_items).filter(([_, i]) => permissions[i.perm]),
        [profile_dropdown_items, permissions]
    );

    return (
        <motion.div
            ref={topbarRef}
            className={`
        sticky top-0 w-full z-[100]
        bg-[#0c0f11] text-cyan-100 backdrop-blur-md border-b border-cyan-900
        ${elevated ? "shadow-md" : "shadow-none"}
      `}
            initial={prefersReducedMotion ? false : { y: -8, opacity: 0 }}
            animate={prefersReducedMotion ? undefined : { y: 0, opacity: 1 }}
            transition={{ duration: 0.22, ease: EASE }}
        >
            {/* Route progress bar */}
            <AnimatePresence>
                {routeLoading && (
                    <motion.div
                        key="route-progress"
                        className="absolute left-0 top-0 h-[2px] bg-cyan-500/80"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: `${progress}%`, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    />
                )}
            </AnimatePresence>

            {/* compact, non-scrollable header */}
            <div
                id="app-topbar"
                className="
          px-3 sm:px-4 lg:px-6
          py-1
          flex items-center gap-2 sm:gap-3
          overflow-visible
        "
            >
                {/* Mobile burger */}
                <motion.button
                    onClick={onMobileToggle}
                    className="md:hidden p-2 rounded-md hover:bg-cyan-900/20 transition"
                    aria-label="Open menu"
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
                >
                    <Bars3Icon className="h-5 w-5 text-cyan-200" />
                </motion.button>

                {/* Logo + collapse (desktop) */}
                <div className="hidden md:block">
                    <SidebarHeader collapsed={collapsed} toggleSidebar={toggleSidebar} />
                </div>

                {/* Divider */}
                <div className="hidden md:block h-6 w-px bg-cyan-900 mx-2" />

                {/* Search */}
                <motion.div
                    className="flex-1 min-w-0"
                    whileHover={prefersReducedMotion ? undefined : { scale: 1.005 }}
                    transition={{ type: "spring", stiffness: 260, damping: 24 }}
                >
                    <CompanySearchBar
                        onSelect={async (company) => {
                            await onRouteTo(router, "company", company.id);
                        }}
                        showHint={false}
                        placeholder="Search for companies"
                        inputExpand
                        permission={ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY}
                    />
                </motion.div>

                {/* Actions */}
                <div
                    className="relative ml-auto flex items-center justify-end gap-2 sm:gap-3 flex-shrink-0"
                    ref={profileMenuRef}
                >
                    {canSeeAnnouncements && (
                        <div className="relative flex-shrink-0" ref={announcementIconRef as React.RefObject<HTMLDivElement>}>
                            <motion.button
                                onClick={onToggleAnnouncements}
                                className="p-2 rounded-full hover:bg-cyan-900/20 transition"
                                title="Announcements"
                                aria-haspopup="dialog"
                                aria-expanded={showAnnouncements}
                                whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
                            >
                                <SpeakerWaveIcon className="h-5 w-5 text-cyan-300" />
                            </motion.button>
                        </div>
                    )}

                    {/* Profile */}
                    <motion.div
                        ref={profileButtonRef as React.RefObject<HTMLDivElement>}
                        onClick={() => {
                            setShowProfileMenu((prev) => {
                                if (!prev) setHighlightedIndex(0);
                                return !prev;
                            });
                        }}
                        className="p-1.5 rounded-full hover:bg-cyan-900/20 transition cursor-pointer group relative min-w-[34px] flex-shrink-0"
                        role="button"
                        aria-haspopup="menu"
                        aria-expanded={showProfileMenu}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                    >
                        <UserCircleIcon className="h-8 w-8 text-cyan-100 group-hover:text-cyan-300 transition" />
                        <span className="absolute -top-1.5 -right-1.5 bg-green-500 rounded-full w-3 h-3 border-2 border-cyan-900" />
                    </motion.div>

                    {/* Profile menu */}
                    <AnimatePresence>
                        {showProfileMenu && (
                            <motion.div
                                initial={prefersReducedMotion ? false : { opacity: 0, y: -10, scale: 0.98 }}
                                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10, scale: 0.98 }}
                                transition={{ duration: 0.18, ease: EASE }}
                                className="absolute top-full mt-2 w-52 rounded-lg shadow-xl z-[120] overflow-hidden border border-cyan-900 right-0 bg-[#0c0f11]"
                            >
                                <ProfileDropdownPortal
                                    anchorEl={profileButtonRef.current}
                                    show={showProfileMenu}
                                    onClose={() => setShowProfileMenu(false)}
                                >
                                    <div className="py-1">
                                        {visibleMenuItems.map(([key, item], visibleIdx) => {
                                            const isSelected = visibleIdx === highlightedIndex;
                                            return (
                                                <motion.div
                                                    key={key}
                                                    onClick={() => {
                                                        setShowProfileMenu(false);
                                                        setActiveComponent(item.component());
                                                    }}
                                                    className={`group flex items-center justify-start gap-3 px-4 py-2.5 text-sm font-medium cursor-pointer transition-all ${isSelected
                                                            ? "bg-gradient-to-r from-cyan-800/30 to-cyan-900/40 text-cyan-200"
                                                            : "bg-transparent text-cyan-100 hover:bg-[#15232b] hover:text-cyan-200"
                                                        }`}
                                                    initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }}
                                                    animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.15, ease: EASE }}
                                                >
                                                    {item.icon(
                                                        `h-5 w-5 ${isSelected ? "text-cyan-300" : "text-cyan-400 group-hover:text-cyan-300"}`
                                                    )}
                                                    <span className="truncate">{item.label}</span>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </ProfileDropdownPortal>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Backdrop for announcements (click-away) */}
            <AnimatePresence>
                {showAnnouncements && (
                    <motion.div
                        key="ann-backdrop"
                        className="fixed inset-0 z-[990]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.0 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowAnnouncements(false)}
                    />
                )}
            </AnimatePresence>

            {/* Announcements popover: FIXED & above everything */}
            <AnimatePresence>
                {showAnnouncements && annPos && (
                    <motion.div
                        ref={announcePanelRef}
                        initial={prefersReducedMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
                        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: EASE }}
                        className="fixed z-[999] w-[22rem] bg-[#111418] border border-cyan-900 rounded-lg shadow-2xl"
                        style={{ top: annPos.top, left: annPos.left }}
                        role="dialog"
                        aria-label="Announcements"
                    >
                        <div className="absolute -top-1 right-6 w-3 h-3 bg-[#111418] rotate-45 border-t border-l border-cyan-900" />
                        <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-cyan-900">
                            <p className="text-sm font-semibold text-cyan-200">Announcements</p>
                            <button
                                onClick={onRefreshAnnouncements}
                                disabled={refreshingAnns || loadingAnns}
                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition ${refreshingAnns
                                        ? "border-cyan-700 text-cyan-300 bg-[#0d1f2b]"
                                        : "border-cyan-800 text-cyan-200 hover:bg-[#0f2130]"
                                    } disabled:opacity-50`}
                            >
                                <ArrowPathIcon className={`w-4 h-4 ${refreshingAnns ? "animate-spin" : ""}`} />
                                {refreshingAnns ? "Refreshing…" : "Refresh"}
                            </button>
                        </div>

                        <div className="p-3 max-h-[70vh] overflow-y-auto space-y-3">
                            {loadingAnns ? (
                                Array.from({ length: MAX_ANNOUNCEMENTS }).map((_, i) => (
                                    <div key={i} className="h-20 rounded-md border border-cyan-800/40 bg-[#122531] animate-pulse" />
                                ))
                            ) : announcements.length === 0 ? (
                                <p className="text-sm text-cyan-600 text-center">No announcements found.</p>
                            ) : (
                                announcements.slice(0, MAX_ANNOUNCEMENTS).map((a: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className="relative border border-cyan-800 rounded-md bg-[#122531] hover:bg-[#1a2e38] px-4 py-3 transition"
                                    >
                                        <p className="font-semibold text-sm text-cyan-100">{a.title}</p>
                                        {a.brief && <p className="text-sm text-cyan-300 mt-1">{a.brief}</p>}
                                        <p className="text-xs text-cyan-600 mt-2">
                                            {new Date(a.created_at).toLocaleString("en-IN", {
                                                dateStyle: "medium",
                                                timeStyle: "short",
                                            })}
                                        </p>
                                        {a.is_link && a.where_to_look && (
                                            <div className="absolute bottom-3 right-4">
                                                <a
                                                    href={a.where_to_look}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs px-2 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition"
                                                >
                                                    View
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
