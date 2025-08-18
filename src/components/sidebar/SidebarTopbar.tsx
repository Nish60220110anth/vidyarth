// components/sidebar/SidebarTopBar.tsx
import { AnimatePresence, motion } from "framer-motion";
import { SpeakerWaveIcon, UserCircleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import CompanySearchBar from "../CompanySearchDropDown";
import { ACCESS_PERMISSION } from "@prisma/client";
import toast from "react-hot-toast";
import ProfileDropdownPortal from "@/portals/DropDownDomainPortal";
import { useRouter } from "next/router";
import { JSX, useCallback, useMemo, useRef, useState } from "react";
import { onRouteTo } from "@/utils/urlClick";
import axios, { AxiosResponse } from "axios";
import { useAuth } from "@/contexts/AuthContext";

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
    announcementIconRef: React.RefObject<HTMLDivElement | null>;
    profileButtonRef: React.RefObject<HTMLDivElement | null>;
    setActiveComponent: (component: JSX.Element) => void;
}

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
}: SidebarTopBarProps) {
    const router = useRouter();
    const { basePath } = router;
    const profileMenuRef = useRef<HTMLDivElement>(null);

    const [loadingAnns, setLoadingAnns] = useState(false);
    const [refreshingAnns, setRefreshingAnns] = useState(false);
    const lastFetchedRef = useRef(0);
    const inFlightRef = useRef<AbortController | null>(null);
    const { user } = useAuth();

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
            className="
        sticky top-0 z-30 bg-[#0c0f11] text-cyan-100 w-full
        border-b border-cyan-900 backdrop-blur-md
        px-3 sm:px-6 py-2
        flex items-center gap-2 sm:gap-4
        flex-nowrap overflow-x-auto
      "
        >
            {/* Left: label + search — keep in one row, allow shrink */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <h2 className="text-base sm:text-lg text-white font-semibold hidden md:block">
                    Search Companies
                </h2>

                {/* Neutralize CompanySearchBar's built-in top margin so it stays single-line */}
                <div className="-mt-4 sm:mt-0 flex-1 min-w-0">
                    <CompanySearchBar
                        onSelect={async (company) => {
                            await onRouteTo(router, "company", company.id);
                        }}
                        showHint={false}
                        placeholder="Search for companies"
                        inputExpand
                        permission={ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY}
                    />
                </div>
            </div>

            {/* Divider (keep only on >= sm to save space) */}
            <div className="h-6 w-px bg-cyan-900 mx-2 sm:mx-4 hidden sm:block" />

            {/* Right: icons group — never wrap */}
            <div
                className="
          relative ml-auto flex items-center justify-end gap-2 sm:gap-3
          flex-shrink-0 whitespace-nowrap
        "
                ref={profileMenuRef}
            >
                {canSeeAnnouncements && (
                    <div className="relative flex-shrink-0" ref={announcementIconRef}>
                        <div
                            onClick={onToggleAnnouncements}
                            className="p-2 rounded-full hover:bg-cyan-900/20 transition cursor-pointer"
                            title="Announcements"
                        >
                            <SpeakerWaveIcon className="h-6 w-6 text-cyan-300" />
                        </div>

                        <AnimatePresence>
                            {showAnnouncements && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute right-0 mt-2 w-[22rem] bg-[#111418] border border-cyan-900 rounded-lg shadow-xl z-50"
                                >
                                    <div className="absolute -top-1 right-6 w-3 h-3 bg-[#111418] rotate-45 border-t border-l border-cyan-900 z-0" />

                                    <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-cyan-900">
                                        <p className="text-sm font-semibold text-cyan-200">Announcements</p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRefreshAnnouncements();
                                            }}
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

                                    <div className="p-3 max-h-[18rem] overflow-y-auto space-y-3">
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
                    </div>
                )}

                <div
                    ref={profileButtonRef}
                    onClick={() => {
                        setShowProfileMenu((prev) => {
                            if (!prev) setHighlightedIndex(0);
                            return !prev;
                        });
                    }}
                    className="p-2 rounded-full hover:bg-cyan-900/20 transition cursor-pointer group relative min-w-[36px] flex-shrink-0"
                >
                    <UserCircleIcon className="h-9 w-9 text-cyan-100 hover:text-cyan-300 transition" />
                    <span className="absolute -top-1.5 -right-1.5 bg-green-500 rounded-full w-3 h-3 border-2 border-cyan-900" />
                </div>

                <AnimatePresence>
                    {showProfileMenu && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute top-full mt-2 w-52 rounded-lg shadow-xl z-50 overflow-hidden border border-cyan-900 right-0 bg-[#0c0f11]"
                        >
                            <ProfileDropdownPortal
                                anchorEl={profileButtonRef.current}
                                show={showProfileMenu}
                                onClose={() => setShowProfileMenu(false)}
                            >
                                {visibleMenuItems.map(([key, item], visibleIdx) => {
                                    const isSelected = visibleIdx === highlightedIndex;
                                    return (
                                        <div
                                            key={key}
                                            onClick={() => {
                                                setShowProfileMenu(false);
                                                setActiveComponent(item.component());
                                            }}
                                            className={`group flex items-center justify-start gap-3 px-4 py-2.5 text-sm font-medium rounded-md cursor-pointer transition-all ${isSelected
                                                    ? "bg-gradient-to-r from-cyan-800/30 to-cyan-900/40 text-cyan-200"
                                                    : "bg-transparent text-cyan-100 hover:bg-[#15232b] hover:text-cyan-200"
                                                }`}
                                        >
                                            {item.icon(
                                                `h-5 w-5 ${isSelected ? "text-cyan-300" : "text-cyan-400 group-hover:text-cyan-300"}`
                                            )}
                                            <span className="truncate">{item.label}</span>
                                        </div>
                                    );
                                })}
                            </ProfileDropdownPortal>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
