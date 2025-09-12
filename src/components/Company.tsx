import Head from "next/head";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import {
    AcademicCapIcon,
    ArrowDownTrayIcon,
    ArrowPathIcon,
    BookOpenIcon,
    ChartBarSquareIcon,
    ClipboardDocumentListIcon,
    DocumentTextIcon,
    NewspaperIcon,
    VideoCameraIcon,
} from "@heroicons/react/24/outline";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { toast } from "react-hot-toast";

import { ACCESS_PERMISSION } from "@prisma/client";
import { decodeSecureURL } from "@/utils/shared/secureUrlApi";

import CompendiumPane from "./content/CompendiumPane";
import JDPane from "./content/JDPane";
import NewsPane from "./content/NewsPane";
import OverviewPane from "./content/OverviewPane";
import SummaryPane from "./content/SummaryPane";
import VideoPane from "./content/VideoPane";

import { DOMAIN_COLORS } from "./ManageCompanyList";
import type { Company } from "./CompanySearchDropDown";
import type { JDEntry, NewsEntry, PaneKey, VideoEntry } from "@/types/panes";
import {
    fetchCompanyInfo,
    fetchJDByCompanyID,
    fetchNewsByCompanyID,
    fetchVideosByCompanyID,
} from "@/lib/api/company";
import { getFileBlobByPath } from "@/lib/api/file";

/* ------------------------------- UI helpers -------------------------------- */

const AlumExpPane = () => <p className="text-gray-700">This is the Alum Exp pane.</p>;

const HeaderSkeleton = () => (
    <div className="sticky top-0 z-40 w-full px-4 sm:px-6 py-4 bg-white shadow-sm flex gap-4 items-center">
        <div className="w-16 h-16 rounded-md bg-gray-200 animate-pulse" />
        <div className="flex flex-col gap-2">
            <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="flex gap-2 flex-wrap">
                <div className="h-4 w-16 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-4 w-14 bg-gray-200 rounded-full animate-pulse" />
            </div>
        </div>
    </div>
);

const BodySkeleton = () => (
    <div className="flex-1 min-h-0 px-3 sm:px-6 py-3 sm:py-4 overflow-y-auto bg-gray-50">
        <div className="bg-white rounded-xl p-6 shadow-md space-y-4">
            <div className="h-6 w-3/4 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-full bg-gray-100 animate-pulse rounded" />
            <div className="h-4 w-full bg-gray-100 animate-pulse rounded" />
            <div className="h-4 w-2/3 bg-gray-100 animate-pulse rounded" />
        </div>
    </div>
);

/* --------------------------------- Tabs ----------------------------------- */

type PaneDef = {
    label: PaneKey;
    icon: JSX.Element;
    color: string;
    component: (props: Record<string, any>) => JSX.Element;
};

export const PANE_CONFIG: PaneDef[] = [
    {
        label: "Summary",
        icon: <ChartBarSquareIcon className="w-4 h-4 mr-1" />,
        component: ({ company_id }) => <SummaryPane props={{ company_id }} />,
        color: "bg-blue-100 text-blue-800",
    },
    // {
    //     label: "Overview",
    //     icon: <DocumentTextIcon className="w-4 h-4 mr-1" />,
    //     component: ({ company_id }) => <OverviewPane props={{ company_id }} />,
    //     color: "bg-purple-100 text-purple-800",
    // },
    {
        label: "Compendium",
        icon: <BookOpenIcon className="w-4 h-4 mr-1" />,
        component: ({ company_id }) => <CompendiumPane props={{ company_id }} />,
        color: "bg-red-100 text-red-800",
    },
    {
        label: "News",
        icon: <NewspaperIcon className="w-4 h-4 mr-1" />,
        component: ({ allNews }) => <NewsPane props={{ news: allNews || [] }} />,
        color: "bg-yellow-100 text-yellow-800",
    },
    {
        label: "Job Description",
        icon: <ClipboardDocumentListIcon className="w-4 h-4 mr-1" />,
        component: ({ allJds }) => <JDPane props={{ jds: allJds || [] }} />,
        color: "bg-green-100 text-green-800",
    },
    {
        label: "Videos",
        icon: <VideoCameraIcon className="w-4 h-4 mr-1" />,
        component: ({ allVideos }) => <VideoPane props={{ videos: allVideos || [] }} />,
        color: "bg-indigo-100 text-indigo-800",
    },
    // {
    //     label: "Alum Exp",
    //     icon: <AcademicCapIcon className="w-4 h-4 mr-1" />,
    //     component: () => <AlumExpPane />,
    //     color: "bg-pink-100 text-pink-800",
    // },
];

/* -------------------------------- Component -------------------------------- */

export default function CompanyPage() {
    const router = useRouter();
    const [companyId, setCompanyId] = useState<number>(0);

    const [company, setCompany] = useState<Company>();
    const [allJds, setAllJDS] = useState<Partial<JDEntry>[]>();
    const [allVideos, setAllVideos] = useState<Partial<VideoEntry>[]>();
    const [allNews, setAllNews] = useState<Partial<NewsEntry>[]>();

    const [activeTab, setActiveTab] = useState<PaneKey>(PANE_CONFIG[0].label);
    const [direction, setDirection] = useState(0);

    const [isPageReady, setIsPageReady] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const currentTabIndex = PANE_CONFIG.findIndex((p) => p.label === activeTab);
    const hasValidJDs = (allJds ?? []).some((jd) => jd?.jd_pdf_path);

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    /* ----------------------------- URL / companyId ---------------------------- */

    useEffect(() => {
        if (!router.isReady) return;
        const run = async () => {
            const auth = router.query.auth as string | undefined;
            if (!auth) {
                setCompanyId(0);
                return;
            }
            try {
                const decrypted = await decodeSecureURL(decodeURIComponent(auth));
                const valid =
                    decrypted.success &&
                    decrypted.key.toUpperCase() === "COMPANY" &&
                    typeof decrypted.id === "number";
                setCompanyId(valid ? decrypted.id : 0);
            } catch {
                setCompanyId(0);
            }
        };
        run();
    }, [router.isReady, router.query.auth]);

    useEffect(() => {
        if (companyId > 0) {
            const t = setTimeout(() => setIsPageReady(true), 240);
            return () => clearTimeout(t);
        }
        setIsPageReady(false);
    }, [companyId]);

    /* ------------------------------- Tab from URL ----------------------------- */

    useEffect(() => {
        if (!router.isReady) return;
        const tabParam = (router.query.tab as string | undefined)?.toLowerCase();
        const validTab = PANE_CONFIG.find((p) => p.label.toLowerCase() === tabParam);
        if (validTab) setActiveTab(validTab.label);
        else if (tabParam) {
            const fallback = PANE_CONFIG[0].label;
            setActiveTab(fallback);
            router.replace(
                { pathname: router.pathname, query: { ...router.query, tab: fallback } },
                undefined,
                { shallow: true }
            );
        }
    }, [router.isReady, router.query.tab]);

    /* ------------------------------- Data fetch -------------------------------- */

    const fetchAll = useCallback(async () => {
        if (!companyId || isNaN(companyId)) return;

        const abort = new AbortController();
        setRefreshing(true);

        try {
            const [c, j, v, n] = await Promise.allSettled([
                fetchCompanyInfo(companyId, ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY),
                fetchJDByCompanyID(companyId),
                fetchVideosByCompanyID(companyId),
                fetchNewsByCompanyID(companyId),
            ]);

            if (!mountedRef.current) return;

            if (c.status === "fulfilled") setCompany(c.value.data as any);
            if (j.status === "fulfilled") setAllJDS(j.value.data as any);
            if (v.status === "fulfilled") setAllVideos(v.value.data as any);
            if (n.status === "fulfilled") setAllNews(n.value.data as any);
        } finally {
            if (mountedRef.current) setRefreshing(false);
        }

        return () => abort.abort();
    }, [companyId]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    /* --------------------------------- Helpers -------------------------------- */

    const paneProps: Record<PaneKey, JSX.Element> = useMemo(
        () => ({
            "Job Description": <JDPane props={{ jds: allJds || [] }} />,
            Videos: <VideoPane props={{ videos: allVideos || [] }} />,
            News: <NewsPane props={{ news: allNews || [] }} />,
            Overview: <OverviewPane props={{ company_id: companyId }} />,
            Summary: <SummaryPane props={{ company_id: companyId }} />,
            Compendium: <CompendiumPane props={{ company_id: companyId }} />,
            "Alum Exp": <AlumExpPane />,
        }),
        [allJds, allVideos, allNews, companyId]
    );

    const counts = {
        jds: (allJds || []).filter((j) => j.is_current).length || 0,
        news: (allNews || []).length || 0,
        videos: (allVideos || []).length || 0,
    };

    const handleDownloadJDs = async () => {
        setDownloading(true);
        try {
            const raw = Array.isArray(allJds) ? allJds : [];
            const entries = raw.filter((jd) => jd.is_current);
            if (!entries.length) {
                toast.error("No JDs available to download.");
                return;
            }
            const cycle = `${entries[0].cycle_type}_${entries[0].year}`;
            const getExt = (name?: string) => name?.split(".").pop()?.toLowerCase() || "pdf";
            const fileNameFor = (jd: Partial<JDEntry>) =>
                `${jd.company}_${jd.role}.${getExt(jd.jd_pdf_name)}`;

            if (entries.length === 1) {
                const jd = entries[0];
                if (!jd.jd_pdf_path) {
                    toast.error("File path missing");
                    return;
                }
                const blob = await getFileBlobByPath(jd.jd_pdf_path);
                saveAs(blob, fileNameFor(jd));
                return;
            }

            const zip = new JSZip();
            const tasks = entries.map(async (jd) => {
                if (!jd.jd_pdf_path) return;
                const blob = await getFileBlobByPath(jd.jd_pdf_path);
                zip.file(fileNameFor(jd), blob);
            });
            await Promise.allSettled(tasks);
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${cycle}_${company?.company_full}_JDs.zip`);
        } catch {
            toast.error("Failed to download file");
        } finally {
            setDownloading(false);
        }
    };

    /* --------------------------------- Render --------------------------------- */

    if (!isPageReady) {
        return (
            <div className="h-screen flex flex-col bg-gray-100 font-[Urbanist]">
                <HeaderSkeleton />
                <div className="w-full px-6 py-2 bg-white shadow">
                    <div className="h-6 w-1/2 bg-gray-200 rounded animate-pulse" />
                </div>
                <BodySkeleton />
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>{company?.company_full || company?.company_name || "Company"}</title>
            </Head>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35 }}
                className="h-screen flex flex-col bg-gray-100 font-[Urbanist] scroll-smooth pt-1"
            >
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-white shadow-sm flex flex-col sm:flex-row justify-between sm:items-start gap-4"
                >
                    <div className="flex items-center gap-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="relative"
                        >
                            <div className="absolute inset-0" />
                            <Image
                                src={company?.logo_url || ""}
                                alt="Logo"
                                width={64}
                                height={64}
                                className="rounded-md object-cover shadow"
                            />
                        </motion.div>

                        <div className="flex flex-col">
                            <motion.h1
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-xl font-bold text-gray-800"
                            >
                                {company?.company_full || company?.company_name}
                            </motion.h1>

                            <div className="flex flex-wrap gap-1 sm:gap-2 mt-1 justify-center sm:justify-start">
                                {company?.domains?.map((d, i) => {
                                    const color =
                                        DOMAIN_COLORS[d.domain?.toUpperCase()] || {
                                            bg: "bg-gray-100",
                                            text: "text-gray-800",
                                        };
                                    return (
                                        <motion.span
                                            key={`${d.domain}-${i}`}
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.25 + i * 0.05 }}
                                            className={`text-sm px-2 py-0.5 rounded-full font-medium ${color.bg} ${color.text}`}
                                        >
                                            {d.domain}
                                        </motion.span>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="flex flex-col sm:flex-row flex-wrap gap-2 items-center justify-center sm:justify-end w-full sm:w-auto"
                    >
                        {/* Refresh (normalized) */}
                        <button
                            onClick={fetchAll}
                            className="group inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium
               border border-slate-300 text-slate-700 bg-white shadow-sm
               hover:shadow hover:ring-1 hover:ring-cyan-400
               transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40
               min-w-[9.5rem]"
                            aria-label="Refresh company data"
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                            <span className="group-hover:text-cyan-700 transition-colors">Refresh</span>
                        </button>

                        {/* Download JD (normalized + disabled state) */}
                        <div className="relative inline-block">
                            <button
                                onClick={hasValidJDs ? handleDownloadJDs : undefined}
                                disabled={!hasValidJDs}
                                className={`group inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                  shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40
                  min-w-[9.5rem]
                  ${hasValidJDs
                                        ? "border border-slate-300 text-slate-700 bg-white hover:shadow hover:ring-1 hover:ring-cyan-400"
                                        : "border border-slate-300 text-slate-400 bg-slate-100 cursor-not-allowed"}`}
                                aria-disabled={!hasValidJDs}
                            >
                                <ArrowDownTrayIcon
                                    className={`w-4 h-4 transition-transform duration-200
                    ${hasValidJDs ? "text-slate-500 group-hover:-translate-y-0.5" : "text-slate-400"}`}
                                />
                                <span className={`${hasValidJDs ? "group-hover:text-cyan-700" : "text-slate-400"} transition-colors`}>
                                    {hasValidJDs ? "Download JD" : "No JD"}
                                </span>
                            </button>

                            <AnimatePresence>
                                {counts.jds > 0 && (
                                    <motion.span
                                        key="jd-badge"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.8, opacity: 0 }}
                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                        className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full shadow-sm leading-none z-10"
                                    >
                                        {counts.jds}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>

                </motion.div>

                {/* Tabs */}
                <div className="w-full bg-white shadow px-3 sm:px-6 py-2">
                    <div className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
                        {PANE_CONFIG.map((pane) => {
                            const isActive = activeTab === pane.label;
                            const badge =
                                pane.label === "News" ? counts.news : pane.label === "Videos" ? counts.videos : pane.label === "Job Description" ? counts.jds : 0;

                            return (
                                <button
                                    key={pane.label}
                                    onClick={() => {
                                        const newIndex = PANE_CONFIG.findIndex((p) => p.label === pane.label);
                                        setDirection(newIndex > currentTabIndex ? 1 : -1);
                                        setActiveTab(pane.label);
                                        router.replace(
                                            { pathname: router.pathname, query: { ...router.query, tab: pane.label } },
                                            undefined,
                                            { shallow: true }
                                        );
                                    }}
                                    className={`relative flex items-center min-w-max px-3 py-1.5 text-xs sm:text-sm rounded-md transition font-medium uppercase ${isActive
                                            ? `${pane.color} font-semibold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-current`
                                            : "text-gray-600 hover:bg-gray-100"
                                        }`}
                                >
                                    <span className="flex items-center">
                                        {pane.icon}
                                        {pane.label}
                                    </span>
                                    {badge > 0 && (
                                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-black/10" : "bg-gray-200 text-gray-700"}`}>
                                            {badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content (only scroll container) */}
                <div className="flex-1 min-h-0 min-w-0 px-3 sm:px-6 py-3 sm:py-4 overflow-y-auto bg-gray-50">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={activeTab}
                            initial={{ x: 40 * direction, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -40 * direction, opacity: 0 }}
                            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                            className="bg-white rounded-xl p-6 shadow-lg"
                        >
                            {paneProps[activeTab]}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Download overlay */}
                {downloading && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center">
                        <div className="h-16 w-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(0,255,255,0.6)] mb-4" />
                        <p className="text-cyan-200 text-base sm:text-lg font-medium animate-pulse px-4 text-center">Downloading…</p>
                    </div>
                )}
            </motion.div>
        </>
    );
}
