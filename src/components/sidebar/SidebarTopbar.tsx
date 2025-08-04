// components/sidebar/SidebarTopBar.tsx
import { AnimatePresence, motion } from "framer-motion";
import { SpeakerWaveIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import CompanySearchBar from "../CompanySearchDropDown";
import { ACCESS_PERMISSION } from "@prisma/client";
import toast from "react-hot-toast";
import ProfileDropdownPortal from "@/portals/DropDownDomainPortal";
import { useRouter } from "next/router";
import { JSX, useRef } from "react";
import { onRouteTo } from "@/utils/urlClick";
import axios from "axios";
import { baseUrl } from "@/lib/config";

interface SidebarTopBarProps {
    id: number;
    email: string;
    name: string;
    role: string;
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
    id,
    email,
    name,
    role,
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
    setActiveComponent
}: SidebarTopBarProps) {
    const router = useRouter();
    const profileMenuRef = useRef<HTMLDivElement>(null);

    const fetchAnnouncements = async () => {
        try {
            const res = await axios.get(`${baseUrl}/api/announcements?userId=${id}`, {
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
                }
            });


            if (!res.data.success) {
                toast.error(res.data.error)
                return;
            }

            setAnnouncements(res.data.data)
        } catch (err) {
            console.error(err);
            toast.error("Error fetching announcements");
        }
    };

    return (
        <motion.div className="sticky top-0 z-30 bg-[#0c0f11] text-cyan-100 w-full border-b border-cyan-900 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1">
                <h2 className="text-lg text-white font-semibold hidden md:block">Search Companies</h2>
                <CompanySearchBar
                    onSelect={async (company) => {
                        await onRouteTo(router, "company", company.id);
                    }}
                    showHint={false}
                    placeholder="Search for companies"
                    inputExpand={true}
                    permission={ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY}
                />
            </div>

            <div className="h-6 w-px bg-cyan-900 mx-4 hidden sm:block" />

            <div className="relative w-full sm:w-auto ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3"
                ref={profileMenuRef}
            >
                {permissions[ACCESS_PERMISSION.ENABLE_ANNOUNCEMENTS] && (
                    <div className="relative" ref={announcementIconRef}>
                        <div
                            onClick={async () => {
                                await fetchAnnouncements();
                                setShowAnnouncements((prev) => !prev);
                            }}
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
                                    <div className="p-3 max-h-[18rem] overflow-y-auto space-y-3">
                                        {announcements.length === 0 ? (
                                            <p className="text-sm text-cyan-600 text-center">No announcements found.</p>
                                        ) : (
                                            announcements.slice(0, 3).map((a, idx) => (
                                                <div key={idx} className="relative border border-cyan-800 rounded-md bg-[#122531] hover:bg-[#1a2e38] px-4 py-3 transition">
                                                    <p className="font-semibold text-sm text-cyan-100">{a.title}</p>
                                                    <p className="text-sm text-cyan-300 mt-1">{a.brief}</p>
                                                    <p className="text-xs text-cyan-600 mt-2">
                                                        {new Date(a.created_at).toLocaleString("en-IN", {
                                                            dateStyle: "medium",
                                                            timeStyle: "short",
                                                        })}
                                                    </p>
                                                    {a.is_link && (
                                                        <div className="absolute bottom-3 right-4">
                                                            <a href={a.where_to_look} target="_blank" rel="noopener noreferrer"
                                                                className="text-xs px-2 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition">
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
                                {Object.entries(profile_dropdown_items).map(([key, item], index) => {
                                    if (!permissions[item.perm]) return null;
                                    const visibleItems = Object.entries(profile_dropdown_items).filter(([_, i]) => permissions[i.perm]);
                                    const currentIndex = visibleItems.findIndex(([k]) => k === key);
                                    const isSelected = currentIndex === highlightedIndex;

                                    return (
                                        <div
                                            key={key}
                                            onClick={() => {
                                                setShowProfileMenu(false);
                                                setActiveComponent(item.component());
                                            }}
                                            className={`group flex items-center justify-start gap-3 px-4 py-2.5 text-sm font-medium rounded-md cursor-pointer transition-all
                            ${isSelected
                                                    ? "bg-gradient-to-r from-cyan-800/30 to-cyan-900/40 text-cyan-200"
                                                    : "bg-transparent text-cyan-100 hover:bg-[#15232b] hover:text-cyan-200"
                                                }`}
                                        >
                                            {item.icon(`h-5 w-5 ${isSelected ? "text-cyan-300" : "text-cyan-400 group-hover:text-cyan-300"}`)}
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
