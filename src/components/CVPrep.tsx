import { fetchSession, SessionInfo } from "@/utils/api";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { RichTextPane } from "./RichTextPane";
import axios from "axios";
import { ACCESS_PERMISSION } from "@prisma/client";
import { useIsMobile } from "@/hooks/useMobile";
import { convertListsToParagraphs } from "@/utils/convertListToPara";
import { motion } from "framer-motion";
import { CheckCircleIcon, PencilSquareIcon, XCircleIcon } from "@heroicons/react/24/solid";

export default function HowToPrepareCV() {
    const isMobile = useIsMobile();

    const [session, setSession] = useState<SessionInfo | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState<string>("");
    const [originalContent, setOriginalContent] = useState<string>("");
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
            const res = await axios.get(`/api/prep/?rType=overview`, {
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
                }
            });

            if (!res.data.success) {
                toast.error(res.data.error)
                return;
            }

            setContent(res.data.content);
            setOriginalContent(res.data.content);
        } catch (err: any) {
            toast.error(err)
            setContent("");
            setOriginalContent("");
        }
    };

    const saveOverviewContent = async () => {
        try {
            const res = await axios.put(`/api/prep`, {
                content,
                rType: "overview"
            }, {
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.EDIT_COMPANY_INFO
                }
            });

            if (!res.data.success) {
                toast.error(res.data.error)
                return;
            }

            setOriginalContent(content);
            setIsEditing(false);
        } catch (err) {
            toast.error("Failed to save overview");
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await loadSession();
            await fetchPermissions();
            await fetchOverviewContent();
            setLoading(false);
        };
        init();
    }, []);

    const isEditor =
        session?.role && permissions.includes(ACCESS_PERMISSION.EDIT_COMPANY_INFO);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[150px] bg-gray-50 border border-cyan-100 rounded-md text-sm text-cyan-600 font-medium gap-2 px-4 py-3 shadow-sm">
                <svg
                    className="w-4 h-4 animate-spin text-cyan-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 4v4m0 8v4m8-8h4M4 12H0m16.24-6.24l2.83 2.83M4.93 19.07l2.83-2.83M19.07 19.07l-2.83-2.83M4.93 4.93l2.83 2.83"
                    />
                </svg>
                Loading content...
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex items-center justify-center min-h-[150px] bg-red-50 border border-red-200 rounded-md text-sm text-red-600 font-medium gap-2 px-4 py-3 shadow-sm">
                <svg
                    className="w-4 h-4 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z"
                    />
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
            <div
                className="group bg-gray-100 border border-gray-200 hover:border-cyan-400 rounded-xl shadow-lg px-4 sm:px-6 py-0 space-y-4 w-full transition-all duration-300 ease-in-out h-full overflow-hidden"
            >
                <div className="h-full overflow-y-auto">
                    {isEditor && (
                        <div className="sticky top-0 z-10 bg-gray-100 border-b border-gray-300 py-3 flex flex-col sm:flex-row justify-end items-start sm:items-center gap-2">
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
                            editable={isEditing}
                            lexicalState={
                                !isEditing
                                    ? isMobile
                                        ? convertListsToParagraphs(content)
                                        : content
                                    : undefined
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
