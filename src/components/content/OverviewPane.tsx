import { fetchSession, SessionInfo } from "@/utils/api";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { RichTextPane } from "../RichTextPane";
import axios from "axios";
import { ACCESS_PERMISSION } from "@prisma/client";
import { OverviewEntry } from "@/types/panes";
import { useIsMobile } from "@/hooks/useMobile";
import { convertListsToParagraphs } from "@/utils/convertListToPara";

export default function Overview({ props }: { props: OverviewEntry }) {
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
        const res = await axios.get(`/api/permissions`, {

        });
        setPermissions(res.data.permissions);
    };

    const fetchOverviewContent = async () => {
        try {
            const res = await axios.get(`/api/overview`, {
                params: { companyId: props.company_id },
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
            const res = await axios.put(`/api/overview`, {
                companyId: props.company_id,
                content,
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
    );

}
