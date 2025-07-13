import { fetchSession, SessionInfo } from "@/utils/api";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { RichTextPane } from "./RichTextPane";
import axios from "axios";
import { ACCESS_PERMISSION, DOMAIN } from "@prisma/client";
import { useIsMobile } from "@/hooks/useMobile";
import { convertListsToParagraphs } from "@/utils/convertListToPara";
import { motion } from "framer-motion";
import { CheckCircleIcon, PencilSquareIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { DOMAIN_COLORS } from "./ManageCompanyList";

export default function HowToPrepareCV() {
    const isMobile = useIsMobile();

    const [session, setSession] = useState<SessionInfo | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDomain, setSelectedDomain] = useState<DOMAIN>(DOMAIN.CONSULTING);

    const [originalContent, setOriginalContent] = useState<string>("");
    const [content, setContent] = useState<string>("");

    const [isEditing, setIsEditing] = useState(false);

    const loadSession = async () => {
        const data = await fetchSession();
        if (!data.success) {
            toast.error("Failed to load session");
            return;
        }
        setSession(data.data);
    };

    const fetchPermissions = async () => {
        const res = await axios.get(`/api/permissions`);
        setPermissions(res.data.permissions);
    };

    const fetchOverviewContent = async () => {
        try {

            const res = await axios.get(`/api/prep/?rType=domain&d=${selectedDomain}&t=${Date.now()}`, {
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
                }
            });
            
            if (!res.data.success) {
                toast.error(res.data.error);
                return;
            }
            
            setContent(res.data.content);
            setOriginalContent(res.data.content);
        } catch (err: any) {
            toast.error("Error loading content");
            setContent("");
            setOriginalContent("");
        }
    };

    const saveOverviewContent = async () => {
        try {
            const res = await axios.put(`/api/prep`, {
                content,
                rType: "domain",
                d: selectedDomain
            }, {
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.EDIT_COMPANY_INFO,
                }
            });

            if (!res.data.success) {
                toast.error(res.data.error);
                return;
            }

            setOriginalContent(content);
            setIsEditing(false);
        } catch (err) {
            toast.error("Failed to save content");
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await loadSession();
            await fetchPermissions();
            setLoading(false);
        };
        init();
    }, []);

    useEffect(() => {
        if (session) {
            fetchOverviewContent();
        }
    }, [selectedDomain, session]);

    const isEditor =
        session?.role && permissions.includes(ACCESS_PERMISSION.EDIT_COMPANY_INFO);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[150px] bg-gray-50 border border-cyan-100 rounded-md text-sm text-cyan-600 font-medium gap-2 px-4 py-3 shadow-sm">
                <svg className="w-4 h-4 animate-spin text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v4m0 8v4m8-8h4M4 12H0m16.24-6.24l2.83 2.83M4.93 19.07l2.83-2.83M19.07 19.07l-2.83-2.83M4.93 4.93l2.83 2.83" />
                </svg>
                Loading content...
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex items-center justify-center min-h-[150px] bg-red-50 border border-red-200 rounded-md text-sm text-red-600 font-medium gap-2 px-4 py-3 shadow-sm">
                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
                </svg>
                Unable to load content. Please try again.
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-h-[calc(100vh-5.5rem)]"
        >
            {/* Tabs for domain selection */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-2 sm:px-6 py-3 overflow-x-auto whitespace-nowrap flex gap-2 backdrop-blur supports-[backdrop-filter]:bg-white/80">
                {Object.values(DOMAIN).map((dom) => {
                    const color = DOMAIN_COLORS[dom] ?? { bg: "bg-gray-100", text: "text-gray-800" };
                    const isSelected = selectedDomain === dom;

                    return (
                        <button
                            key={dom}
                            onClick={() => {
                                setIsEditing(false);
                                setSelectedDomain(dom);
                            }}
                            className={`
                    text-sm px-4 py-1.5 rounded-full font-medium border transition-all duration-200
                    ${isSelected
                                    ? `${color.bg} ${color.text} ${color.border} border-transparent shadow-sm`
                                    : `bg-white text-gray-700 border-gray-300 hover:${color.bg} hover:${color.text} hover:${color.border}`}
                `}
                        >
                            {dom}
                        </button>
                    );
                })}
            </div>

            {/* Content editor section */}
            <div className="group bg-white border border-gray-200 rounded-2xl shadow-lg px-4 sm:px-8 py-0 space-y-4 w-full transition-all duration-300 ease-in-out h-full overflow-hidden">
                <div className="h-full overflow-y-auto">
                    {isEditor && (
                        <div className="sticky top-0 z-10 border-b border-gray-300 py-3 flex flex-col sm:flex-row justify-end items-start sm:items-center gap-2">
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="w-full sm:w-auto px-4 py-1.5 text-sm rounded-md border border-cyan-500 text-cyan-700 bg-white hover:bg-cyan-50 hover:shadow-md transition-all duration-200 ease-in-out font-medium flex items-center gap-2"
                                >
                                    <PencilSquareIcon className="w-4 h-4" />
                                    Edit
                                </button>
                            ) : (
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                    <button
                                        onClick={() => {
                                            setContent(originalContent);
                                            setIsEditing(false);
                                        }}
                                        className="px-4 py-1.5 text-sm rounded-md border border-red-400 text-red-600 bg-white hover:bg-red-50 hover:shadow transition-all duration-200 w-full sm:w-auto font-medium flex items-center gap-2"
                                    >
                                        <XCircleIcon className="w-4 h-4" />
                                        Cancel
                                    </button>
                                    <button
                                        onClick={saveOverviewContent}
                                        className="px-4 py-1.5 text-sm rounded-md bg-cyan-600 text-white hover:bg-cyan-700 shadow-sm hover:shadow-md transition-all duration-200 w-full sm:w-auto font-semibold flex items-center gap-2"
                                    >
                                        <CheckCircleIcon className="w-4 h-4 text-white" />
                                        Save
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pb-6">
                        <RichTextPane
                            key={selectedDomain}
                            editable={isEditing}
                            lexicalState={
                                !isEditing
                                    ? isMobile
                                        ? convertListsToParagraphs(content)
                                        : content
                                    : content
                            }
                            OnSetContent={(f: string) => setContent(f)}
                            placeholder={isEditor ? "Enter content here..." : "Content not available yet"}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
