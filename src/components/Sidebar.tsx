import { JSX, useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

// External libs
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightOnRectangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

// Utils & helpers
import { toTitleCase } from "./Profile";
import { decodeSecureURL } from "@/utils/shared/secureUrlApi";
import { onRouteTo } from "@/utils/urlClick";
import { addCompanyToRecentHistory } from "@/utils/recentCompany";
import { getSectionsPermissions } from "@/constants/sectionPermission";
import { getProfileDropdownItems } from "@/constants/profileDropdownItems";
import { useDropdownMenuHandlers } from "@/hooks/useDropdownMenuHandlers";
import { fetchPermissionsFromSession, getUserFromSession } from "@/lib/api/user";

// Components
import WelcomePage from "./Welcome";
import CompanyPage from "./Company";
import SidebarNav from "./sidebar/SidebarNav";
import SidebarTopBar from "./sidebar/SidebarTopbar";
import SidebarUserProfile from "./sidebar/SidebarUserProfile";

// Types
import type { Company } from "./CompanySearchDropDown";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
    email: string;
    role: string;
    onLogout: () => void;
    name: string;
    id: number;
}

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Sidebar({ email, role, onLogout, name, id }: SidebarProps) {
    const router = useRouter();
    const { user } = useAuth();

    /* Refs */
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const profileButtonRef = useRef<HTMLElement | null>(null);
    const announcementIconRef = useRef<HTMLElement | null>(null);
    const lastActiveKeyIndex = useRef<number>(-1);

    /* UI state */
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showAnnouncements, setShowAnnouncements] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

    /* Permissions & navigation */
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const [activeKeyIndex, setActiveKeyIndex] = useState<number>(0);
    const [activeComponent, setActiveComponent] = useState<JSX.Element | null>(null);

    /* Data */
    const [announcements, setAnnouncements] = useState<any[]>([]);

    const toggleSidebar = () => setCollapsed((prev) => !prev);
    const toggleMobile = () => setMobileOpen((v) => !v);

    const onCompanySelected = async (company: Company) => {
        addCompanyToRecentHistory(company);
        onRouteTo(router, "COMPANY", company.id);
        setShowProfileMenu(false);
        setMobileOpen(false);
    };

    const sections_permissions = useMemo(
        () => getSectionsPermissions({ id, name, email, role, router, onCompanySelected }),
        [id, name, email, role, router]
    );

    const profile_dropdown_items = useMemo(
        () => getProfileDropdownItems({ name, email, role, id }),
        [name, email, role, id]
    );

    useDropdownMenuHandlers(
        {
            profileMenuRef,
            announcementRef: announcementIconRef,
        },
        {
            setActiveComponent,
            showProfileMenu,
            setShowProfileMenu,
            showAnnouncements,
            setShowAnnouncements,
            profile_dropdown_items,
            permissions,
            highlightedIndex,
            setHighlightedIndex,
        }
    );

    useEffect(() => {
        const run = async () => {
            if (user) {
                const perms = fetchPermissionsFromSession(
                    { sections_permissions, profile_dropdown_items },
                    user
                );
                setPermissions(perms.data || {});
            } else {
                try {
                    const res = await getUserFromSession();
                    if (res.data) {
                        const perms = fetchPermissionsFromSession(
                            { sections_permissions, profile_dropdown_items },
                            user
                        );
                        setPermissions(perms.data || {});
                    } else {
                        toast.error(res.error || "Failed to fetch user role");
                    }
                } catch (err: any) {
                    toast.error(err.response?.error || "Failed to fetch user role");
                    return;
                }
            }
        };
        run();
    }, []); // eslint-disable-line

    useEffect(() => {
        if (!activeKey) {
            setActiveComponent(null);
            return;
        }
        const section = sections_permissions[activeKey];
        if (section && permissions[section.perm]) {
            setActiveComponent(() => section.component());
        } else if (activeKey === "COMPANY") {
            setActiveComponent(<CompanyPage />);
        } else {
            setActiveComponent(null);
        }
    }, [activeKey, permissions, sections_permissions]);

    useEffect(() => {
        const run = async () => {
            const auth = router.query.auth as string | undefined;
            if (!auth) {
                setActiveKey("DASHBOARD");
                setShowProfileMenu(false);
                return;
            }

            if (!permissions || Object.keys(permissions).length === 0) return;
            const decodedAuth = await decodeSecureURL(decodeURIComponent(auth));

            if (!decodedAuth.success) {
                toast.error(`${decodedAuth.error}`);
                return;
            }

            const key = decodedAuth.key;
            const actualKey = key.replaceAll(" ", "_").toUpperCase();
            const section = sections_permissions[actualKey];

            const fallbackKey = actualKey === "COMPANY" ? "COMPANY" : "DASHBOARD";

            const sectionKeys = Object.keys(sections_permissions);
            const newIndex = sectionKeys.findIndex((k) => k === actualKey);
            setActiveKey(section && permissions[section.perm] ? actualKey : fallbackKey);
            setActiveKeyIndex(section && permissions[section.perm] ? newIndex : 0);
        };
        run();
    }, [router.query.auth, permissions, sections_permissions]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
            if (e.key.length !== 1) return;
            const pressedKey = e.key.toUpperCase();

            for (const [key, config] of Object.entries(sections_permissions)) {
                const { shortcut, perm, component } = config;
                if (shortcut === pressedKey && permissions[perm]) {
                    e.preventDefault();
                    setActiveKey(key);
                    setActiveComponent(() => component());
                    break;
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [permissions, sections_permissions]);

    const groupedItems: Record<
        string,
        { label: string; icon: any; component: () => JSX.Element; key: string; shortcut: string; _label: string }[]
    > = {};

    Object.entries(sections_permissions).forEach(([key, { section, perm, icon, component, shortcut, label }]) => {
        if (permissions[perm]) {
            if (!groupedItems[section]) groupedItems[section] = [];
            groupedItems[section].push({ label: key.replaceAll("_", " "), icon, component, key, shortcut, _label: label });
        }
    });

    const direction = activeKeyIndex > lastActiveKeyIndex.current ? 1 : -1;
    lastActiveKeyIndex.current = activeKeyIndex;

    return (
        <>
            <Head>
                <title>{toTitleCase(activeKey?.toLocaleLowerCase().replaceAll("_", " ") || "Charon")}</title>
            </Head>

            {/* PAGE: column layout -> TopBar at top, then below a row with left nav + right content */}
            <div className="h-dvh flex flex-col">
                {/* TOPBAR (full width at the very top) */}
                <SidebarTopBar
                    permissions={permissions}
                    profile_dropdown_items={profile_dropdown_items}
                    showProfileMenu={showProfileMenu}
                    setShowProfileMenu={setShowProfileMenu}
                    highlightedIndex={highlightedIndex}
                    setHighlightedIndex={setHighlightedIndex}
                    showAnnouncements={showAnnouncements}
                    setShowAnnouncements={setShowAnnouncements}
                    announcements={announcements}
                    setAnnouncements={setAnnouncements}
                    profileButtonRef={profileButtonRef}
                    announcementIconRef={announcementIconRef}
                    setActiveComponent={setActiveComponent}
                    collapsed={collapsed}
                    toggleSidebar={toggleSidebar}
                    onMobileToggle={toggleMobile}
                    mobileOpen={mobileOpen}
                />

                {/* BELOW THE HEADER: left = nav, right = content */}
                <div className="flex-1 min-h-0 flex">
                    {/* Desktop sidebar (left) */}
                    <aside
                        className={`hidden md:flex bg-[#0c0f11] text-cyan-100 transition-all duration-300 ease-in-out backdrop-blur-md ${collapsed ? "w-20" : "w-64"
                            } flex-col shadow-xl min-h-0 overflow-hidden`}
                    >
                        <SidebarNav
                            collapsed={collapsed}
                            groupedItems={groupedItems}
                            activeKey={activeKey}
                            onItemClick={(key) => onRouteTo(router, key, 0)}
                        />

                        <SidebarUserProfile collapsed={collapsed} name={name} email={email} role={role} />

                        <div className="mt-auto p-4 border-t border-gray-900">
                            <button
                                onClick={onLogout}
                                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                            >
                                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                                {!collapsed && <span>Logout</span>}
                            </button>
                        </div>
                    </aside>

                    {/* Mobile drawer sidebar (slides over content) */}
                    <AnimatePresence>
                        {mobileOpen && (
                            <>
                                <motion.div
                                    key="backdrop"
                                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2, ease: EASE }}
                                    onClick={() => setMobileOpen(false)}
                                />
                                <motion.aside
                                    key="drawer"
                                    className="fixed inset-y-0 left-0 z-50 w-72 bg-[#0c0f11] text-cyan-100 shadow-2xl md:hidden flex flex-col"
                                    initial={{ x: -320 }}
                                    animate={{ x: 0 }}
                                    exit={{ x: -320 }}
                                    transition={{ duration: 0.28, ease: EASE }}
                                >
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-900">
                                        <span className="text-[1.05rem] font-semibold tracking-wide">CHARON</span>
                                        <button
                                            onClick={() => setMobileOpen(false)}
                                            className="p-1.5 rounded-md hover:bg-cyan-900/20 transition"
                                            aria-label="Close"
                                        >
                                            <XMarkIcon className="h-6 w-6 text-cyan-200" />
                                        </button>
                                    </div>

                                    <div className="min-h-0 flex-1 overflow-y-auto">
                                        <SidebarNav
                                            collapsed={false}
                                            groupedItems={groupedItems}
                                            activeKey={activeKey}
                                            onItemClick={(key) => {
                                                onRouteTo(router, key, 0);
                                                setMobileOpen(false);
                                            }}
                                        />
                                    </div>

                                    <div className="border-t border-gray-900">
                                        <SidebarUserProfile collapsed={false} name={name} email={email} role={role} />
                                        <div className="p-4">
                                            <button
                                                onClick={() => {
                                                    setMobileOpen(false);
                                                    onLogout();
                                                }}
                                                className="w-full inline-flex items-center justify-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                                            >
                                                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    </div>
                                </motion.aside>
                            </>
                        )}
                    </AnimatePresence>

                    {/* Main content (right) */}
                    <main className="flex-1 bg-[#0a141d] text-cyan-100 flex flex-col min-h-0 overflow-hidden">
                        <AnimatePresence mode="wait" custom={direction}>
                            {activeComponent ? (
                                <motion.div
                                    key={activeKey}
                                    custom={direction}
                                    initial={{ opacity: 0, y: direction > 0 ? 18 : -18 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: direction > 0 ? -18 : 18 }}
                                    transition={{ duration: 0.25, ease: EASE }}
                                    className="h-full w-full overflow-y-auto"
                                >
                                    {activeComponent}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="placeholder"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.25, ease: EASE }}
                                    className="text-gray-500 text-center"
                                >
                                    <WelcomePage
                                        onGotoDashboard={async () => {
                                            onRouteTo(router, "COMPANY DIRECTORY", 0);
                                        }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </main>
                </div>
            </div>
        </>
    );
}
