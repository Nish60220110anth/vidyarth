import Head from "next/head";
import Image from "next/image";
import { JSX, useState } from "react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
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


const SummaryPane = () => <p>This is the Summary pane.</p>;
const OverviewPane = () => <p>This is the Overview pane.</p>;
const NewsPane = () => <p>This is the News pane.</p>;
const JdPane = () => <p>This is the JD pane.</p>;
const CompendiumPane = () => <p>This is the Compendium pane.</p>;
const VideosPane = () => <p>This is the Videos pane.</p>;
const AlumExpPane = () => <p>This is the Alum Exp pane.</p>;

export const PANE_CONFIG: {
    label: string;
    icon: JSX.Element;
    component: JSX.Element;
    color: string;
}[] = [
        {
            label: "Summary",
            icon: <ChartBarSquareIcon className="w-4 h-4 mr-1" />,
            component: <SummaryPane />,
            color: "bg-blue-100 text-blue-800",
        },
        {
            label: "Overview",
            icon: <DocumentTextIcon className="w-4 h-4 mr-1" />,
            component: <OverviewPane />,
            color: "bg-purple-100 text-purple-800",
        },
        {
            label: "News",
            icon: <NewspaperIcon className="w-4 h-4 mr-1" />,
            component: <NewsPane />,
            color: "bg-yellow-100 text-yellow-800",
        },
        {
            label: "JD",
            icon: <ClipboardDocumentListIcon className="w-4 h-4 mr-1" />,
            component: <JdPane />,
            color: "bg-green-100 text-green-800",
        },
        {
            label: "Compendium",
            icon: <BookOpenIcon className="w-4 h-4 mr-1" />,
            component: <CompendiumPane />,
            color: "bg-red-100 text-red-800",
        },
        {
            label: "Videos",
            icon: <VideoCameraIcon className="w-4 h-4 mr-1" />,
            component: <VideosPane />,
            color: "bg-indigo-100 text-indigo-800",
        },
        {
            label: "Alum Exp",
            icon: <AcademicCapIcon className="w-4 h-4 mr-1" />,
            component: <AlumExpPane />,
            color: "bg-pink-100 text-pink-800",
        },
    ];

export default function CompanyPage({ id, company }: { id: number; company: Company }) {
    const companyId = Array.isArray(id) ? id[0] : id;
    const [activeTab, setActiveTab] = useState(PANE_CONFIG[0].label);
    const activePane = PANE_CONFIG.find((p) => p.label === activeTab);


    return (
        <>
            <Head>
                <title>Company Page</title>
            </Head>

            <div className="min-h-screen flex flex-col bg-gray-100 font-[Urbanist]">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                    className="w-full px-6 py-4 bg-white shadow-sm flex justify-between items-start border-b border-gray-200"
                >
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

                            <div className="flex flex-wrap gap-2 mt-1">
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
                        className="flex flex-col gap-2 items-end"
                    >
                        <button
                            onClick={() => toast.success("Downloading JD...")}
                            className="flex items-center gap-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-200 transition"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            Download JD
                        </button>

                        <button
                            onClick={() => toast("Announcements opened")}
                            className="flex items-center gap-1 bg-cyan-600 text-white px-4 py-2 rounded-md text-sm shadow-sm hover:bg-cyan-700 transition"
                        >
                            <SpeakerWaveIcon className="w-4 h-4" />
                            Announcements
                        </button>
                    </motion.div>
                </motion.div>


                {/* Tabs */}
                <div className="w-full bg-white shadow px-6 py-2">
                    <div className="flex flex-wrap gap-3 overflow-x-auto">
                        {PANE_CONFIG.map((pane) => (
                            <button
                                key={pane.label}
                                onClick={() => setActiveTab(pane.label)}
                                className={`flex items-center px-4 py-1.5 text-sm rounded-md transition font-medium ${activeTab === pane.label
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
                <div className="flex-1 p-6 overflow-auto">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white p-6 rounded-lg shadow-md h-full"
                    >
                        <h2 className="text-xl font-semibold mb-2">{activeTab}</h2>
                        {activePane?.component}
                    </motion.div>
                </div>
            </div>
        </>
    );
}
