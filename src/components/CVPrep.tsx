import { fetchSession, SessionInfo } from "@/utils/api";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { RichTextPane } from "./RichTextPane";
import { ACCESS_PERMISSION } from "@prisma/client";
import { useIsMobile } from "@/hooks/useMobile";
import { convertListsToParagraphs } from "@/utils/convertListToPara";
import { motion } from "framer-motion";
import {
    CheckCircleIcon,
    PencilSquareIcon,
    XCircleIcon,
    ArrowPathIcon,
} from "@heroicons/react/24/solid";
import { fetchPermissions } from "@/lib/api/user";
import { fetchOverviewContent, updateOveriewContent } from "@/lib/api/cvprep";

export default function HowToPrepareCV() {
    const isMobile = useIsMobile();

    const [session, setSession] = useState<SessionInfo | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const [content, setContent] = useState<string>("");
    const [originalContent, setOriginalContent] = useState<string>("");

    const [isEditing, setIsEditing] = useState(false);

    // ---- data loaders ---------------------------------------------------------

    const loadSession = useCallback(async () => {
        const data = await fetchSession();
        if (!data.success) {
            toast.error("Failed to load session");
            return;
        }
        setSession(data.data);
    }, []);

    const _fetchPermissions = useCallback(async () => {
        try {
            const res = await fetchPermissions();
            setPermissions(res);
        } catch {
            // ignore
        }
    }, []);

    const loadOverview = useCallback(async () => {
        const res = await fetchOverviewContent();
        if (res) {
            setOriginalContent(res);
            setContent(res);
        } else {
            setOriginalContent("");
            setContent("");
        }
    }, []);

    const refreshOverview = useCallback(async () => {
        setLoading(true);
        try {
            await loadOverview();
        } catch {
            toast.error("Refresh failed");
        } finally {
            setLoading(false);
        }
    }, [loadOverview]);

    const saveOverviewContent = useCallback(async () => {
        const res = await updateOveriewContent(content);
        if (res) {
            setOriginalContent(content);
            setIsEditing(false);
            toast.success("Saved");
        } else {
            toast.error("Save failed");
        }
    }, [content]);

    // ---- lifecycle ------------------------------------------------------------

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await loadSession();
            await _fetchPermissions();
            await loadOverview();
            setLoading(false);
        };
        init();
    }, [loadSession, _fetchPermissions, loadOverview]);

    // ---- roles ----------------------------------------------------------------

    const isEditor =
        !!session?.role && permissions.includes(ACCESS_PERMISSION.EDIT_COMPANY_INFO);

    // ---- UI -------------------------------------------------------------------

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-w-full py-12 bg-gradient-to-r from-cyan-50 to-white border border-cyan-200 rounded-2xl shadow-xl animate-pulse">
                <div className="flex items-center justify-center w-full py-12">
                    <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="mt-4 text-lg font-semibold text-cyan-700">Loading CV Prep Content ...</p>
                <div className="mt-6 space-y-2 w-3/4">
                    <div className="h-3 bg-gray-200 rounded-full"></div>
                    <div className="h-3 bg-gray-200 rounded-full w-5/6"></div>
                    <div className="h-3 bg-gray-200 rounded-full w-2/3"></div>
                </div>
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
            className="h-full flex flex-col"
        >
            <div
                className="
          group bg-[#0a141d] border border-cyan-900 rounded-2xl shadow-lg
          px-4 sm:px-8 py-0 w-full transition-all duration-300 ease-in-out
          flex flex-col flex-1 min-h-0
        "
            >
                <div className="flex flex-col flex-1 min-h-0">
                    {isEditor && (
                        <div className="sticky top-0 z-10 border-b border-cyan-800 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            {/* Left: Refresh (always visible while editor available) */}
                            <button
                                onClick={refreshOverview}
                                className="px-4 py-1.5 text-sm rounded-md border border-cyan-500 text-cyan-300 bg-transparent hover:bg-cyan-900/30 hover:shadow-md transition-all duration-200 font-medium flex items-center gap-2"
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                                Refresh
                            </button>

                            {/* Right: Edit / Save / Cancel */}
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="w-full sm:w-auto px-4 py-1.5 text-sm rounded-md border border-cyan-500 text-cyan-300 bg-transparent hover:bg-cyan-900/30 hover:shadow-md transition-all duration-200 font-medium flex items-center gap-2"
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
                                        className="px-4 py-1.5 text-sm rounded-md border border-red-400 text-red-400 bg-transparent hover:bg-red-800/20 hover:shadow transition-all duration-200 w-full sm:w-auto font-medium flex items-center gap-2"
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

                    {/* Content area (fills remaining height) */}
                    <div className="pb-6 mt-5 flex-1 min-h-0 overflow-y-auto">
                        <RichTextPane
                            editable={isEditing}
                            lexicalState={
                                !isEditing
                                    ? isMobile
                                        ? convertListsToParagraphs(content)
                                        : content
                                    : content /* keep editor controlled while editing for consistency with domain prep */
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
