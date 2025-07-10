// components/Sidebar.tsx
import { JSX, useState, useEffect, useRef } from "react";
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    UserIcon,
    BuildingOffice2Icon,
    ClipboardDocumentListIcon,
    DocumentTextIcon,
    ChartBarIcon,
    ArrowRightOnRectangleIcon,
    NewspaperIcon,
    ComputerDesktopIcon,
    EnvelopeIcon,
    HomeIcon,
    Cog6ToothIcon,
    ClipboardDocumentCheckIcon,
    SpeakerWaveIcon,
    UsersIcon,
    VideoCameraIcon
} from "@heroicons/react/24/outline";
import { ACCESS_PERMISSION, USER_ROLE } from "@prisma/client";
import axios from "axios";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { TooltipWrapper } from "./TooltipWrapper";

import CompanySearchBar, { Company } from "./CompanySearchDropDown";
import CompanyPage from "./Company";
import { useRouter } from "next/router";

import {
    ShieldCheckIcon,
    AcademicCapIcon,
    BriefcaseIcon,
    BanknotesIcon,
    WrenchScrewdriverIcon,
    SparklesIcon,
    ChartBarSquareIcon,
    UserCircleIcon
} from "@heroicons/react/24/solid";
import AllCompaniesDirectory from "./AllCompaniesDirectory";
import { addCompanyToRecentHistory } from "@/utils/recentCompany";
import Image from "next/image";

import WelcomePage from "./Welcome";
import MySection from "./MySection";
import LatestNews from "./LatestNews";
import HowToPrepareCV from "./CVPrep";
import DomainCVPrepGuide from "./DomainPrep";
import AIMock from "./AIMock";
import ManageCompanyList from "./ManageCompanyList";
import ManageNews from "./ManageNews";
import ManagePlacementCycle from "./ManagePlacementCycle";
import ManageJD from "./ManageJD";
import PortalHelpFAQ from "./PortalHelpFAQ";

import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";
import ProfileDropdownPortal from "@/portals/DropDownDomainPortal";
import Profile from "./Profile";
import Shortlists from "./Shortlists";
import MyCV from "./MyCV";
import Announcements from "./Announcements";
import Preferences from "./Preferences";
import ManageCohort from "./ManageCohort";
import ManageVideo from "./ManageVideo";


interface SidebarProps {
    email: string;
    role: string;
    onLogout: () => void;
    name: string;
}

export const roleIcons: Record<
    USER_ROLE,
    {
        icon: (cls: string) => JSX.Element;
        color: string;
    }
> = {
    ADMIN: {
        icon: (cls) => <ShieldCheckIcon className={cls} />,
        color: "text-red-400",
    },
    STUDENT: {
        icon: (cls) => <AcademicCapIcon className={cls} />,
        color: "text-blue-300",
    },
    SUPER_STUDENT: {
        icon: (cls) => <SparklesIcon className={cls} />,
        color: "text-purple-400",
    },
    PLACECOM: {
        icon: (cls) => <BriefcaseIcon className={cls} />,
        color: "text-green-300",
    },
    DISHA: {
        icon: (cls) => <UsersIcon className={cls} />,
        color: "text-orange-300",
    },
    ALUMNI: {
        icon: (cls) => <UserCircleIcon className={cls} />,
        color: "text-indigo-300",
    },
    CCA_FINANCE: {
        icon: (cls) => <BanknotesIcon className={cls} />,
        color: "text-emerald-300",
    },
    CCA_CONSULT: {
        icon: (cls) => <ChartBarSquareIcon className={cls} />,
        color: "text-cyan-300",
    },
    CCA_PRODMAN: {
        icon: (cls) => <WrenchScrewdriverIcon className={cls} />,
        color: "text-pink-300",
    },
    CCA_OPERATIONS: {
        icon: (cls) => <WrenchScrewdriverIcon className={cls} />,
        color: "text-teal-300",
    },
    CCA_GENMAN: {
        icon: (cls) => <UsersIcon className={cls} />,
        color: "text-lime-300",
    },
    CCA_MARKETING: {
        icon: (cls) => <SparklesIcon className={cls} />,
        color: "text-rose-300",
    },
};


export default function Sidebar({ email, role, onLogout, name }: SidebarProps) {


    const router = useRouter();
    const keyFromRouter = router.query.key as string | undefined;

    const [collapsed, setCollapsed] = useState(false);
    const [activeComponent, setActiveComponent] = useState<JSX.Element | null>(null);
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const [activeCompany, setActiveCompany] = useState<Company | null>(null);
    const is_company = activeCompany !== null && activeCompany.id !== null && activeCompany.id !== undefined && activeCompany.id !== 0;

    const profileMenuRef = useRef<HTMLDivElement>(null);
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

    const [theme, setTheme] = useState<"light" | "dark">("dark");

    const profileButtonRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem("theme") as "light" | null;
        if (stored === "light") setTheme("light");
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle("dark", theme === "dark");
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    };


    const toggleSidebar = () => setCollapsed((prev) => !prev);

    const onCompanySelected = (company: Company) => {
        addCompanyToRecentHistory(company);

        setActiveCompany(company);
        setActiveKey(null);
        setActiveComponent(null);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!showProfileMenu) return;

            const items = Object.entries(profile_dropdown_items).filter(([_, item]) =>
                permissions[item.perm]
            );

            if (items.length === 0) return;

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setHighlightedIndex((prev) =>
                        prev === null || prev === items.length - 1 ? 0 : prev + 1
                    );
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setHighlightedIndex((prev) =>
                        prev === null || prev === 0 ? items.length - 1 : prev - 1
                    );
                    break;
                case "Enter":
                    e.preventDefault();
                    if (highlightedIndex !== null) {
                        const [, item] = items[highlightedIndex];
                        setActiveComponent(item.component());
                        setShowProfileMenu(false);
                    }
                    break;
                case "Escape":
                    e.preventDefault();
                    setShowProfileMenu(false);
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [showProfileMenu, permissions, highlightedIndex]);

    const sections_permissions: Record<
        string,
        {
            section: string;
            perm: ACCESS_PERMISSION;
            icon: (className: string) => JSX.Element;
            component: () => JSX.Element,
            shortcut: string;
        }
    > = {
        MY_SECTION: {
            section: "_generic",
            perm: ACCESS_PERMISSION.ENABLE_MY_SECTION,
            icon: (cls) => <HomeIcon className={cls} />,
            component: () => <MySection />,
            shortcut: "M"
        },
        COMPANY_DIRECTORY: {
            section: "_generic",
            perm: ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY,
            icon: (cls) => <BuildingOffice2Icon className={cls} />,
            component: () => <AllCompaniesDirectory onCompanySelected={onCompanySelected} />,
            shortcut: "C"
        },
        LATEST_NEWS: {
            section: "_generic",
            perm: ACCESS_PERMISSION.ENABLE_NEWS,
            icon: (cls) => <NewspaperIcon className={cls} />,
            component: () => <LatestNews />,
            shortcut: "L"
        },
        CV_PREP: {
            section: "Preparation",
            perm: ACCESS_PERMISSION.ENABLE_CV_PREP,
            icon: (cls) => <DocumentTextIcon className={cls} />,
            component: () => <HowToPrepareCV />,
            shortcut: "V"
        },
        DOMAIN_PREP: {
            section: "Preparation",
            perm: ACCESS_PERMISSION.ENABLE_CV_PREP,
            icon: (cls) => <ClipboardDocumentListIcon className={cls} />,
            component: () => <DomainCVPrepGuide />,
            shortcut: "D"
        },
        AI_MOCK: {
            section: "Mock",
            perm: ACCESS_PERMISSION.ENABLE_AI_MOCK,
            icon: (cls) => <ComputerDesktopIcon className={cls} />,
            component: () => <AIMock />,
            shortcut: "A"
        },
        COMPANY_LIST: {
            section: "Manage Content",
            perm: ACCESS_PERMISSION.MANAGE_COMPANY_LIST,
            icon: (cls) => <BuildingOffice2Icon className={cls} />,
            component: () => <ManageCompanyList />,
            shortcut: "O"
        },
        NEWS: {
            section: "Manage Content",
            perm: ACCESS_PERMISSION.MANAGE_NEWS,
            icon: (cls) => <ClipboardDocumentListIcon className={cls} />,
            component: () => <ManageNews />,
            shortcut: "N"
        },
        PLACEMENT_CYCLE: {
            section: "Manage Content",
            perm: ACCESS_PERMISSION.MANAGE_PLACEMENT_CYCLE,
            icon: (cls) => <ChartBarIcon className={cls} />,
            component: () => <ManagePlacementCycle />,
            shortcut: "P"
        },
        COMPANY_JD: {
            section: "Manage Content",
            perm: ACCESS_PERMISSION.MANAGE_COMPANY_JD,
            icon: (cls) => <DocumentTextIcon className={cls} />,
            component: () => <ManageJD />,
            shortcut: "J"
        },
        MY_COHORT: {
            section: "Manage Content",
            perm: ACCESS_PERMISSION.MANAGE_MY_COHORT,
            icon: (cls) => <UsersIcon className={cls} />,
            component: () => <ManageCohort />,
            shortcut: "H"
        },
        VIDEO: {
            section: "Manage Content",
            perm: ACCESS_PERMISSION.MANAGE_VIDEOS,
            icon: (cls) => <VideoCameraIcon className={cls} />,
            component: () => <ManageVideo />,
            shortcut: "I"
        },
        ANNOUNCEMENTS: {
            section: "Announcements",
            perm: ACCESS_PERMISSION.MANAGE_ANNOUNCEMENTS,
            icon: (cls) => <SpeakerWaveIcon className={cls} />,
            component: () => <div className="p-6 text-gray-500">Announcements will be displayed here.</div>,
            shortcut: "S"
        },
        EMAILS: {
            section: "Announcements",
            perm: ACCESS_PERMISSION.MANAGE_EMAIL,
            icon: (cls) => <EnvelopeIcon className={cls} />,
            component: () => <div className="p-6 text-gray-500">Email management will be available soon.</div>,
            shortcut: "E"
        },
        PORTAL_HELP_FAQ: {
            section: "Help & FAQ",
            perm: ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY,
            icon: (cls) => <ShieldCheckIcon className={cls} />,
            component: () => <PortalHelpFAQ name={name} email={email} role={role} />,
            shortcut: "F"
        },
    };

    const profile_dropdown_items: Record<string, {
        label: string;
        icon: (cls: string) => JSX.Element;
        perm: ACCESS_PERMISSION;
        component: () => JSX.Element;
    }> = {
        PROFILE: {
            label: "Profile",
            icon: (cls) => <UserIcon className={cls} />,
            perm: ACCESS_PERMISSION.ENABLE_PROFILE,
            component: () => <Profile name={name} email={email} role={role} />
        },
        SHORTLISTS: {
            label: "Shortlists",
            icon: (cls) => <ClipboardDocumentCheckIcon className={cls} />,
            perm: ACCESS_PERMISSION.ENABLE_MY_SECTION,
            component: () => <Shortlists />
        },
        MY_CV: {
            label: "My CV",
            icon: (cls) => <DocumentTextIcon className={cls} />,
            perm: ACCESS_PERMISSION.ENABLE_MY_CV,
            component: () => <MyCV />
        },
        ANNOUNCEMENTS: {
            label: "Announcements",
            icon: (cls) => <SpeakerWaveIcon className={cls} />,
            perm: ACCESS_PERMISSION.ENABLE_ANNOUNCEMENTS,
            component: () => <Announcements />
        },
        PREFERENCES: {
            label: "Preferences",
            icon: (cls) => <Cog6ToothIcon className={cls} />,
            perm: ACCESS_PERMISSION.ENABLE_PREFERENCES,
            component: () => <Preferences />
        },
    };

    const fetchPermissions = async (userRole: string) => {
        const res = await axios.get(`/api/permissions`);
        const perms: Record<string, boolean> = {};
        const extraPerms = [ACCESS_PERMISSION.ENABLE_NOTIFICATIONS];

        const allPerms = [
            ...Object.values(sections_permissions).map(({ perm }) => perm),
            ...Object.values(profile_dropdown_items).map(({ perm }) => perm),
            ...extraPerms
        ];

        allPerms.forEach((perm) => {
            perms[perm] = res.data.permissions.includes(perm);
        });

        setPermissions(perms);
    };

    useEffect(() => {
        if (role) {
            fetchPermissions(role);
        } else {
            axios.get("/api/auth/user").then((res) => {
                if (res.data.role) {
                    fetchPermissions(res.data.role);
                } else {
                    toast.error(res.data.error || "Failed to fetch user role");
                }
            }).catch((err) => {
                toast.error(err.response?.data?.error || "Failed to fetch user role");
            });
        }
    }, []);

    useEffect(() => {
        if (!keyFromRouter) return;

        const section = sections_permissions[keyFromRouter];
        if (section && permissions[section.perm]) {
            setActiveKey(keyFromRouter);
            setActiveComponent(() => section.component());
        }
    }, [permissions, keyFromRouter]);

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
    }, [permissions]);

    const groupedItems: Record<string, { label: string; icon: any; component: () => JSX.Element; key: string, shortcut: string }[]> = {};

    Object.entries(sections_permissions).forEach(([key, { section, perm, icon, component, shortcut }]) => {
        if (permissions[perm]) {
            if (!groupedItems[section]) groupedItems[section] = [];
            groupedItems[section].push({ label: key.replaceAll("_", " "), icon, component, key, shortcut });
        }
    });


    return (
        <div className="flex h-screen">
            <aside
                className={`bg-blue-950 text-white transition-all duration-300 ease-in-out backdrop-blur-md ${collapsed ? "w-20" : "w-64"
                    } flex flex-col shadow-xl`}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-800">

                    {!collapsed ? (
                        <div className="flex items-center gap-3 mt-2">
                            <Image
                                src="/logo.png"
                                alt="Logo"
                                width={40}
                                height={40}
                                className="object-contain filter invert brightness-0 saturate-100 hue-rotate-[170deg]"
                                priority
                            />
                            <span className="text-[1.15rem] font-bold tracking-wide">VIDYARTH</span>
                        </div>
                    ) : (
                        <Image
                            src="/logo.png"
                            alt="Logo"
                            width={40}
                            height={40}
                            className="object-contain filter invert brightness-0 saturate-100 hue-rotate-[170deg] mt-2"
                            priority
                        />
                    )}

                    <button onClick={toggleSidebar} className="text-white text-xl mt-6 ml-2">
                        {collapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto mt-4">
                    {Object.entries(groupedItems).map(([section, items]) => (
                        <div key={section} className="mb-4">
                            {section !== "_generic" && !collapsed && (
                                <div className="px-4 text-xs font-bold uppercase text-gray-400 mb-2">{section}</div>
                            )}
                            {items.map(({ label, icon, component, key, shortcut }) => {
                                const displayLabel = label;

                                return (
                                    <TooltipWrapper keyChar={shortcut} label={displayLabel}>
                                        <div
                                            key={label}
                                            className={`flex items-center justify-between py-3 pr-4 pl-2 mx-2 mb-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer
          ${activeKey === key
                                                    ? "bg-white/10 text-cyan-400 border-l-4 border-cyan-400"
                                                    : "hover:bg-white/10 pl-4"}
        `}
                                            title=""
                                            onClick={() => {

                                                if (is_company) {
                                                    setActiveCompany(null);
                                                }

                                                setActiveKey(key);
                                                setActiveComponent(() => component());
                                            }}

                                        >
                                            <div className="flex items-center gap-4">
                                                {icon("h-5 w-5")}
                                                {!collapsed && <span className="text-sm">{displayLabel}</span>}
                                            </div>
                                            {!collapsed && shortcut && (
                                                <span className="ml-auto bg-white/20 text-[0.65rem] px-2 py-0.5 rounded-md text-white">
                                                    {shortcut}
                                                </span>
                                            )}
                                        </div>
                                    </TooltipWrapper>
                                );
                            })}

                        </div>
                    ))}
                </nav>

                <div className="flex items-center gap-3 group relative">
                    <div
                        className="bg-white/5 p-2 rounded-full border border-white/10 transition transform group-hover:scale-105 group-hover:animate-bounce"
                        title={role}
                    >
                        {(roleIcons[role as USER_ROLE] || {
                            icon: (cls: string) => <UserCircleIcon className={cls} />,
                            color: "text-cyan-300",
                        }).icon(`h-8 w-8 ${roleIcons[role as USER_ROLE]?.color || "text-cyan-300"}`)}
                    </div>

                    {!collapsed && (
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-white">{name}</span>
                            <span className="text-[0.7rem] uppercase tracking-wider text-cyan-400 font-medium">{role}</span>
                            <span className="text-[0.7rem] text-gray-300 truncate max-w-[160px]">{email}</span>
                        </div>
                    )}
                </div>

                <div className="mt-auto p-4 border-t border-gray-800">
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>

            </aside>

            <main className="flex-1 bg-gray-100 overflow-y-auto">
                <motion.div className="sticky top-0 z-30 w-full bg-blue-950 border-b border-blue-900 backdrop-blur-md px-4 
                sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">

                    <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1">
                        <h2 className="text-lg text-white font-semibold hidden md:block">Search Companies</h2>

                        <CompanySearchBar
                            onSelect={(id) => {
                                router.push(
                                    {
                                        pathname: router.pathname,
                                        query: Object.fromEntries(
                                            Object.entries(router.query).filter(
                                                ([k]) => k !== "id" && k !== "tab"
                                            )
                                        ),
                                    },
                                    undefined,
                                    { shallow: true }
                                )

                                setActiveCompany(id);
                                setActiveKey(null);
                                setActiveComponent(null);
                            }}
                            showHint={false}
                            placeholder="Search for companies"
                            inputExpand={true}
                            permission={ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY}
                        />
                    </div>


                    <div className="h-6 w-px bg-blue-900 mx-4 hidden sm:block" />

                    <div
                        className="relative w-full sm:w-auto ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3 min-w-0 max-w-full shrink-0"
                        ref={profileMenuRef}
                    >
                        {/* Announcements icon */}
                        {permissions[ACCESS_PERMISSION.ENABLE_ANNOUNCEMENTS] && (
                            <div
                                onClick={() => toast.success("Announcements clicked")}
                                className="p-2 rounded-full hover:bg-white/10 transition cursor-pointer"
                                title="Announcements"
                            >
                                <SpeakerWaveIcon className="h-6 w-6 text-cyan-300" />
                            </div>
                        )}

                        {/* Notifications icon */}
                        {permissions[ACCESS_PERMISSION.ENABLE_NOTIFICATIONS] && (
                            <div
                                onClick={() => toast.success("Notifications clicked")}
                                className="p-2 rounded-full hover:bg-white/10 transition cursor-pointer"
                                title="Notifications"
                            >

                                <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                                    viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                                    className="h-6 w-6 text-cyan-300">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M14.857 17.403A4.001 4.001 0 0112 19a4.001 4.001 0 01-2.857-1.597m8.178-2.442A4.002 
                4.002 0 0118 13V9a6.002 6.002 0 00-4.5-5.79V3.5a1.5 
                1.5 0 10-3 0v.71A6.002 6.002 0 006 9v4c0 
                1.045-.535 2.005-1.464 2.585A1.5 1.5 0 
                005.5 18h13a1.5 1.5 0 00.964-2.754z" />
                                </svg>
                            </div>
                        )}

                        {/* Theme toggle icon */}
                        <div
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-white/10 transition cursor-pointer"
                            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            {theme === "dark" ? (
                                <SunIcon className="h-6 w-6 text-yellow-300" />
                            ) : (
                                <MoonIcon className="h-6 w-6 text-blue-800" />
                            )}
                        </div>

                        {/* Profile icon and dropdown */}
                        <div
                            ref={profileButtonRef}
                            onClick={() => {
                                setShowProfileMenu((prev) => {
                                    if (!prev) setHighlightedIndex(0);
                                    return !prev;
                                });
                            }}
                            className="p-2 rounded-full hover:bg-white/10 transition cursor-pointer group relative min-w-[36px] flex-shrink-0"
                        >
                            <UserCircleIcon className="h-9 w-9 text-white hover:text-cyan-300 transition" />
                            <span className="absolute -top-1.5 -right-1.5 bg-green-500 rounded-full w-3 h-3 border-2 border-blue-950" />
                        </div>
                        <AnimatePresence>
                            {showProfileMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{
                                        duration: 0.25,
                                        ease: [0.22, 1, 0.36, 1],
                                    }}
                                    className="absolute top-full mt-2 w-52 rounded-lg shadow-xl z-50 overflow-hidden border border-blue-900 bg-blue-950
  right-0 sm:right-0 xs:left-1/2 xs:-translate-x-1/2">
                                    <ProfileDropdownPortal
                                        anchorEl={profileButtonRef.current}
                                        show={showProfileMenu}
                                        onClose={() => setShowProfileMenu(false)}
                                    >
                                        {Object.entries(profile_dropdown_items).map(([key, item], index) => {
                                            if (!permissions[item.perm]) return null;

                                            const visibleItems = Object.entries(profile_dropdown_items).filter(([_, i]) =>
                                                permissions[i.perm]
                                            );

                                            const currentIndex = visibleItems.findIndex(([k]) => k === key);
                                            const isSelected = currentIndex === highlightedIndex;

                                            return (
                                                <div
                                                    key={key}
                                                    onClick={() => {
                                                        setShowProfileMenu(false);
                                                        setActiveComponent(item.component());
                                                    }}
                                                    className={`flex items-center gap-3 px-4 py-2 text-sm cursor-pointer transition
          ${isSelected
                                                            ? "bg-cyan-900 text-cyan-300"
                                                            : "hover:bg-blue-900 hover:text-cyan-300 text-white bg-blue-950"}
        `}
                                                >
                                                    {item.icon(
                                                        `h-5 w-5 ${isSelected ? "text-cyan-400" : "text-cyan-300"}`
                                                    )}
                                                    <span>{item.label}</span>
                                                </div>
                                            );
                                        })}
                                    </ProfileDropdownPortal>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
                <AnimatePresence mode="wait">
                    {(activeComponent || is_company) ? (
                        <motion.div
                            key={activeKey}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.25 }}
                        >
                            {is_company ? (
                                <CompanyPage id={activeCompany.id || 0} company={activeCompany} />
                            ) : (
                                activeComponent
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="placeholder"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-gray-500 text-center"
                        >
                            <WelcomePage onGotoDashboard={() => {
                                setActiveComponent(() => <AllCompaniesDirectory onCompanySelected={onCompanySelected} />);
                                setActiveKey("COMPANY");
                            }} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>


        </div>
    );
}
