import { fetchSession, SessionInfo } from "@/utils/api";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { RichTextPane } from "../RichTextPane";
import axios from "axios";
import { ACCESS_PERMISSION } from "@prisma/client";
import { SummaryEntry } from "@/types/panes";
import { useIsMobile } from "@/hooks/useMobile";
import { convertListsToParagraphs } from "@/utils/convertListToPara";

export default function SummaryPane({ props }: { props: SummaryEntry }) {
    const isMobile = useIsMobile();

    const [session, setSession] = useState<SessionInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState<string>("");


    const test_debug = true;

    const loadSession = async () => {
        const data = await fetchSession();
        if (!data.success) {
            toast.error("Failed to load session");
            return;
        }
        setSession(data.data);
    };

    const fetchSummaryContent = async () => {
        try {
            const res = await axios.get(`/api/summary`, {
                params: { companyId: props.company_id },
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
                }
            });

            if (!res.data.success) {
                toast.error(res.data.error)
                return;
            }

            setContent(res.data);

        } catch (err: any) {
            toast.error(err)
            setContent("");
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await loadSession();
            await fetchSummaryContent();
            setLoading(false);
        };
        init();
    }, []);

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

            <div
                className={`px-4 sm:px-6 py-5}`}
            >
                {
                    !test_debug ? <RichTextPane
                        editable={false}
                        lexicalState={
                            isMobile
                                ? convertListsToParagraphs(content)
                                : content
                        }
                        OnSetContent={(f: string) => setContent(f)}
                        placeholder={"Content not available yet"}
                    /> : (<pre className="bg-gray-900 text-white p-4 rounded text-sm overflow-x-auto">
                        {JSON.stringify(content, null, 2)}
                    </pre>
)
                }
            </div>
        </div>
    );

}
