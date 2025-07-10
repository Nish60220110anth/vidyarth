import Head from "next/head";
import Image from "next/image";
import { JSX, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import { Company } from "./CompanySearchDropDown";

import { ArrowDownTrayIcon, SpeakerWaveIcon } from "@heroicons/react/24/outline";
import {
    ChartBarSquareIcon,
    DocumentTextIcon,
    NewspaperIcon,
    ClipboardDocumentListIcon,
    VideoCameraIcon,
    AcademicCapIcon,
    BookOpenIcon,
} from "@heroicons/react/24/outline";
import { DOMAIN_COLORS } from "./ManageCompanyList";
import axios from "axios";
import JSZip from "jszip";
import { saveAs } from "file-saver";

import JDPane from "./content/JDPane";
import VideoPane from "./content/VideoPane";
import { JDEntry, NewsEntry, VideoEntry } from "@/types/panes";
import NewsPane from "./content/NewsPane";
import OverviewPane from "./content/OverviewPane";
import CompendiumPane from "./content/CompendiumPane";
import { ACCESS_PERMISSION } from "@prisma/client";


type PaneComponentProps = Record<string, any>;

const SummaryPane = () => <p>This is the Summary pane.</p>;
const AlumExpPane = () => <p>This is the Alum Exp pane.</p>;

export const PANE_CONFIG: {
    label: string;
    icon: JSX.Element;
    component: (props: PaneComponentProps) => JSX.Element;
    color: string;
}[] = [
        {
            label: "Summary",
            icon: <ChartBarSquareIcon className="w-4 h-4 mr-1" />,
            component: () => <SummaryPane />,
            color: "bg-blue-100 text-blue-800",
        },
        {
            label: "Overview",
            icon: <DocumentTextIcon className="w-4 h-4 mr-1" />,
            component: ({ company, company_id }) => <OverviewPane props={{
                company: company,
                company_id: company_id,
            }} />,
            color: "bg-purple-100 text-purple-800",
        },
        {
            label: "News",
            icon: <NewspaperIcon className="w-4 h-4 mr-1" />,
            component: ({ allNews }) => <NewsPane props={{
                news: allNews || []
            }} />,
            color: "bg-yellow-100 text-yellow-800",
        },
        {
            label: "Job Description",
            icon: <ClipboardDocumentListIcon className="w-4 h-4 mr-1" />,
            component: ({ allJds }) => <JDPane props={{
                jds: allJds || []
            }} />,
            color: "bg-green-100 text-green-800",
        },
        {
            label: "Compendium",
            icon: <BookOpenIcon className="w-4 h-4 mr-1" />,
            component: ({ company, company_id }) => <CompendiumPane props={{
                company: company,
                company_id: company_id,
            }} />,
            color: "bg-red-100 text-red-800",
        },
        {
            label: "Videos",
            icon: <VideoCameraIcon className="w-4 h-4 mr-1" />,
            component: ({ allVideos }) => <VideoPane props={{
                videos: allVideos || []
            }} />,
            color: "bg-indigo-100 text-indigo-800",
        },
        {
            label: "Alum Exp",
            icon: <AcademicCapIcon className="w-4 h-4 mr-1" />,
            component: () => <AlumExpPane />,
            color: "bg-pink-100 text-pink-800",
        },
    ];

export default function CompanyPage({ id, company }: { id: number; company: Company }) {
    const companyId = Array.isArray(id) ? id[0] : id;
    const [activeTab, setActiveTab] = useState(PANE_CONFIG[0].label);
    const activePane = PANE_CONFIG.find((p) => p.label === activeTab);

    const [prevTabIndex, setPrevTabIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    const currentTabIndex = PANE_CONFIG.findIndex((p) => p.label === activeTab);

    const [allJds, setAllJDS] = useState<Partial<JDEntry>[]>();
    const [allVideos, setAllVideos] = useState<Partial<VideoEntry>[]>();
    const [allNews, setAllNews] = useState<Partial<NewsEntry>[]>();

    const [isDownloading, setIsDownloading] = useState(false);

    const hasValidJDs = (allJds ?? []).some(jd => jd?.jd_pdf_path);

    const paneProps: Record<string, JSX.Element> = {
        "Job Description": <JDPane props={{ jds: allJds || [] }} />,
        "Videos": <VideoPane props={{ videos: allVideos || [] }} />,
        "News": <NewsPane props={{ news: allNews || [] }} />,
        "Overview": <OverviewPane props={{ company, company_id: id }} />,
        "Summary": <SummaryPane />,
        "Compendium": <CompendiumPane props={{ company, company_id: id }} />,
        "Alum Exp": <AlumExpPane />,
    };


    const handleDownloadJDs = async () => {
        setIsDownloading(true);
        const jdEntries = allJds;

        if (!Array.isArray(jdEntries) || jdEntries.length === 0) {
            toast.error("No JDs available to download.");
            return;
        }

        const getExtension = (path: string): string => {
            const parts = path.split(".");
            return parts.length > 1 ? parts.pop()!.toLowerCase() : "pdf";
        };

        if (jdEntries.length === 1) {
            const jd = jdEntries[0];

            if (!jd.jd_pdf_path) {
                toast.error("File path missing");
                return;
            }

            try {
                const ext = getExtension(jd.jd_pdf_path);
                const filename = `${jd.company}_${jd.role}(${jd.cycle_type}_${jd.year}).${ext}`;

                const proxyURL = `/api/proxy-file?url=${encodeURIComponent(jd.jd_pdf_path)}`;
                const response = await axios.get(proxyURL, { responseType: "blob" });

                saveAs(response.data, filename);
                toast.success("Downloaded JD");
            } catch (err) {
                console.error("Download failed", err);
                toast.error("Failed to download file");
                setIsDownloading(false);
            }
            return;
        }

        // Multiple JDs – zip
        const zip = new JSZip();

        for (const jd of jdEntries) {
            if (!jd.jd_pdf_path) {
                toast.error("File path missing");
                continue;
            }

            try {
                const ext = getExtension(jd.jd_pdf_path);
                const filename = `${jd.company}_${jd.role}(${jd.cycle_type}_${jd.year}).${ext}`;

                const proxyURL = `/api/proxy-file?url=${encodeURIComponent(jd.jd_pdf_path)}`;
                const response = await axios.get(proxyURL, { responseType: "blob" });

                zip.file(filename, response.data);
            } catch (err) {
                console.error(`Failed to fetch: ${jd.jd_pdf_path}`, err);
                toast.error(`Failed to fetch file: ${jd.company}`);
                setIsDownloading(false);
            }
        }

        const content = await zip.generateAsync({ type: "blob" });
        setIsDownloading(false);
        saveAs(content, "All_JDs.zip");
        toast.success("Downloaded all JDs");
    };


    const fetchJDs = async () => {
        try {
            const res = await axios.get(`/api/jd?cid=${companyId}`, {
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
                }
            });

            if (!res.data.success) {
                toast.error(res.data.error || "Error fetching JDs")
                return;
            }

            const transformed = res.data.allJDs.map((jd: any): JDEntry => ({
                company: jd.company.company_full,
                role: jd.role,
                cycle_type: jd.placement_cycle.placement_type,
                year: jd.placement_cycle.year,
                jd_pdf_path: jd.pdf_path,
                domains: jd.domains.map((d: any) => d.domain),
            }));
            setAllJDS(transformed);
        } catch (err: any) {
            toast.error(err || "Error fetching JDs");
        }
    };

    const fetchVideos = async () => {
        try {
            const res = await axios.get(`/api/video?cid=${companyId}`, {
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
                }
            });

            if (!res.data.success) {
                toast.error(res.data.error || "Error fetching Videos")
                return;
            }

            const transformed = res.data.allVideos.map((video: any): VideoEntry => ({
                source: video.source,
                title: video.title,
                embed_id: video.embed_id,
                thumbnail_url: video.thumbnail_url,
                updated_at: new Date(video.updated_at),
            }));

            setAllVideos(transformed);
        } catch (err: any) {
            toast.error(err || "Error fetching Videos");
        }
    }

    const fetchNews = async () => {
        try {

            const res = await axios.get(`/api/news?cid=${companyId}`, {
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
                }
            });

            if (!res.data.success) {
                toast.error(res.data.error)
                return;
            }

            const transformed = res.data.newsList.map((news: any): NewsEntry => ({
                title: news.title,
                content: news.content,
                created_at: new Date(news.created_at),
                image_url: news.image_url,
                source_link: news.link_to_source,
                domains: news.domains.map((d: any) => d.domain),
                news_tag: news.news_tag,
                subdomain_tag: news.subdomain_tag,
            }));

            setAllNews(transformed);
        } catch (err: any) {
            toast.error(err || "Failed to load news");
        }
    }

    useEffect(() => {
        fetchJDs();
        fetchVideos();
        fetchNews();
    }, [companyId]);

    return (
        <>
            <Head>
                <title>Company Page</title>
            </Head>

            <div className="min-h-screen flex flex-col bg-gray-100 font-[Urbanist] scroll-smooth">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                    className="sticky top-0 z-40 w-full px-4 sm:px-6 py-3 sm:py-4 bg-white shadow-sm flex flex-col 
                    sm:flex-row justify-between sm:items-start gap-4">
                    {/* Left: Logo + Info */}
                    <div className="flex items-center gap-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                        >
                            <Image
                                src={company.logo_url || "/placeholder-logo.png"}
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
                                {company.company_full}
                            </motion.h1>

                            <div className="flex flex-wrap gap-1 sm:gap-2 mt-1 justify-center sm:justify-start">
                                {company.domains?.map((d, i) => {
                                    const color = DOMAIN_COLORS[d.domain?.toUpperCase()] || {
                                        bg: "bg-gray-100",
                                        text: "text-gray-800",
                                    };

                                    return (
                                        <motion.span
                                            key={d.domain}
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

                    {/* Right: Action Buttons (stacked) */}
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col sm:flex-row flex-wrap gap-2 items-center justify-center sm:justify-end w-full sm:w-auto">
                        <div className="relative inline-block">
                            {/* Button */}
                            <button
                                onClick={async () => {
                                    if (hasValidJDs) handleDownloadJDs();
                                }}
                                disabled={!hasValidJDs}
                                className={`group flex items-center gap-2 px-4 py-2 rounded-md text-sm shadow-sm transition-all duration-200 ease-out
        ${hasValidJDs
                                        ? "border border-gray-300 text-gray-700 bg-white hover:shadow-md hover:ring-1 hover:ring-cyan-400"
                                        : "border border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed"
                                    }`}
                            >
                                <ArrowDownTrayIcon
                                    className={`w-4 h-4 transition-transform duration-200 ${hasValidJDs
                                        ? "text-gray-500 group-hover:-translate-y-0.5"
                                        : "text-gray-400"
                                        }`}
                                />
                                <span
                                    className={`transition-colors duration-200 ${hasValidJDs ? "group-hover:text-cyan-700" : "text-gray-400"
                                        }`}
                                >
                                    {hasValidJDs ? "Download JD" : "No JD"}
                                </span>
                            </button>

                            {/* Badge */}
                            <AnimatePresence>
                                {Array.isArray(allJds) && allJds.length > 0 && (
                                    <motion.span
                                        key="jd-badge"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.8, opacity: 0 }}
                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full shadow-sm leading-none z-10"
                                    >
                                        {allJds.length}
                                    </motion.span>
                                )}
                            </AnimatePresence>

                        </div>


                        <button
                            onClick={() => toast("Announcements opened")}
                            className="group relative flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-md text-sm shadow-md hover:bg-cyan-700 hover:shadow-lg transition-all duration-200 ease-out"
                        >
                            <SpeakerWaveIcon className="w-4 h-4 text-white group-hover:-translate-y-0.5 transition-transform duration-200" />
                            <span className="group-hover:brightness-110 transition duration-200">Announcements</span>
                        </button>

                    </motion.div>

                </motion.div>


                {/* Tabs */}
                <div className="sticky top-[5.25rem] z-30 w-full bg-white shadow px-6 py-2">
                    <div className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
                        {PANE_CONFIG.map((pane) => (
                            <button
                                key={pane.label}
                                onClick={() => {
                                    const newIndex = PANE_CONFIG.findIndex((p) => p.label === pane.label);
                                    setDirection(newIndex > currentTabIndex ? 1 : -1);
                                    setPrevTabIndex(currentTabIndex);
                                    setActiveTab(pane.label);
                                }}

                                className={`
                                    flex items-center min-w-max px-3 py-1.5 text-xs sm:text-sm rounded-md
                                     transition font-medium uppercase ${activeTab === pane.label
                                        ? `${pane.color} font-semibold`
                                        : "text-gray-600 hover:bg-gray-100"
                                    }`}
                            >
                                {pane.icon}
                                {pane.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 px-3 sm:px-6 py-3 sm:py-4 overflow-y-auto bg-gray-50 max-h-[calc(100vh-10.5rem)]">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={activeTab}
                            initial={{ x: 40 * direction, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -40 * direction, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                            className="bg-white rounded-xl p-6 shadow-lg"
                        >
                            {paneProps[activeTab] ?? activePane?.component({})};
                        </motion.div>
                    </AnimatePresence>
                </div>

                {isDownloading && (
                    <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
                        <div className="h-16 w-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(0,255,255,0.6)] mb-4" />
                        <p className="text-cyan-200 text-base sm:text-lg font-medium animate-pulse px-4 text-center">Downloading ...</p>
                    </div>
                )}

            </div>
        </>
    );
}
