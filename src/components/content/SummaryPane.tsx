import { fetchSession, SessionInfo } from "@/utils/api";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { RichTextPane } from "../RichTextPane";
import axios from "axios";
import { ACCESS_PERMISSION } from "@prisma/client";
import { SummaryEntry } from "@/types/panes";
import { useIsMobile } from "@/hooks/useMobile";
import { convertListsToParagraphs } from "@/utils/convertListToPara";
import { fetchSummaryByCid, updateSummaryByCid } from "@/lib/api/panes/summary";
import { fetchPermissions } from "@/lib/api/user";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";

export default function SummaryPane({ props }: { props: SummaryEntry }) {
    const isMobile = useIsMobile();

    const [session, setSession] = useState<SessionInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState<string>("");
    const [originalContent, setOriginalContent] = useState<string>("");
    const [permissions, setPermissions] = useState<string[]>([]);
    const [isEditing, setIsEditing] = useState(false);

    const loadSession = async () => {
        const data = await fetchSession();
        if (!data.success) {
            toast.error("Failed to load session");
            return;
        }
        setSession(data.data);
    };

    const fetchSummaryContent = async () => {
        const res = await fetchSummaryByCid(props.company_id);
        if (res) {
            setContent(res);
            setOriginalContent(res);
        } else {
            setContent("");
            setOriginalContent("");
        }
    };

    const _fetchPermissions = async () => {
        const perm = await fetchPermissions();
        setPermissions(perm);
    };

    const saveOverviewContent = async () => {
        const res = await updateSummaryByCid(props.company_id, content);
        if (res) {
            setOriginalContent(res);
            setIsEditing(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await loadSession();
            await _fetchPermissions();
            await fetchSummaryContent();
            setLoading(false);
        };
        init();
    }, []);

    const isEditor =
        session?.role && permissions.includes(ACCESS_PERMISSION.EDIT_COMPANY_INFO);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-w-full py-12 bg-gradient-to-r from-cyan-50 to-white border border-cyan-200 rounded-2xl shadow-xl animate-pulse">

                <div className="flex items-center justify-center w-full py-12">
                    <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>


                {/* Loading text */}
                <p className="mt-4 text-lg font-semibold text-cyan-700">
                    Loading Summary...
                </p>

                {/* Skeleton lines to hint at structure */}
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
            <div className="flex flex-col items-center justify-center w-full min-h-[200px] bg-gradient-to-br from-red-50 to-white border border-red-200 rounded-2xl shadow-lg px-6 py-8">
                <ExclamationTriangleIcon className="w-12 h-12 text-red-500 animate-bounce" />
                <h3 className="mt-4 text-2xl font-semibold text-red-600">
                    Unable to Load Content
                </h3>
                <p className="mt-2 text-red-500 text-center">
                    Something went wrong on our end. Please try again.
                </p>
            </div>
        );
    }


    return (
        <div className="bg-gray-100 border border-gray-200 rounded-lg shadow-md w-full overflow-hidden">

            {isEditor && (
                <div className="sticky top-0 z-10 bg-gray-100 px-4 sm:px-6 pt-5 pb-3 border-b border-gray-300 flex flex-col sm:flex-row justify-end items-start sm:items-center gap-2">
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="w-full sm:w-auto px-3 py-1 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-200 transition"
                        >
                            Edit
                        </button>
                    ) : (
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => {
                                    setContent(originalContent);
                                    setIsEditing(false);
                                }}
                                className="px-3 py-1 text-sm rounded-md border border-gray-300 text-red-600 hover:bg-red-50 transition w-full sm:w-auto"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveOverviewContent}
                                className="px-3 py-1 text-sm rounded-md border bg-cyan-600 text-white hover:bg-cyan-700 transition w-full sm:w-auto"
                            >
                                Save
                            </button>
                        </div>
                    )}
                </div>
            )}


            <div
                className={`px-4 sm:px-6 py-5 ${isEditing ? "max-h-[500px] overflow-y-auto" : ""
                    }`}
            >

                <RichTextPane
                    editable={isEditing}
                    lexicalState={
                        isMobile
                            ? convertListsToParagraphs(content)
                            : content
                    }
                    OnSetContent={(f: string) => setContent(f)}
                    placeholder={"Content not available yet"}
                />

            </div>
        </div>
    );

}
