import { fetchSession, SessionInfo } from "@/utils/api";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { RichTextPane } from "./RichTextPane";
import { ACCESS_PERMISSION, DOMAIN } from "@prisma/client";
import { useIsMobile } from "@/hooks/useMobile";
import { convertListsToParagraphs } from "@/utils/convertListToPara";
import { motion } from "framer-motion";
import {
    CheckCircleIcon,
    PencilSquareIcon,
    XCircleIcon,
    ArrowPathIcon,
} from "@heroicons/react/24/solid";
import { DOMAIN_COLORS } from "./ManageCompanyList";
import { useRouter } from "next/router";
import { fetchPermissions } from "@/lib/api/user";
import { fetchDomainContent, updateDomainContent } from "@/lib/api/panes/domainprep";
import { toTitleCase } from "./Profile";

export default function DomainPrep() {
    const isMobile = useIsMobile();
    const router = useRouter();

    const [session, setSession] = useState<SessionInfo | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const [originalContent, setOriginalContent] = useState<Partial<Record<DOMAIN, string>>>({});
    const [selectedDomain, setSelectedDomain] = useState<DOMAIN>(DOMAIN.CONSULTING);
    const [content, setContent] = useState<string>("");

    const [isEditing, setIsEditing] = useState(false);

    const loadSession = useCallback(async () => {
        const data = await fetchSession();
        if (!data.success) {
            toast.error("Failed to load session");
            return;
        }
        setSession(data.data);
    }, []);

    useEffect(() => {
        if (!router.isReady) return;

        const domains = Object.keys(DOMAIN).map((p) => p.toLowerCase());
        const tabParam = (router.query.tab as string | undefined)?.toLowerCase();
        const validTab = domains.find((p) => p === tabParam);

        if (validTab) {
            setSelectedDomain(validTab.toUpperCase() as DOMAIN);
        } else {
            const defaultTab = domains[0];
            setSelectedDomain(defaultTab.toUpperCase() as DOMAIN);

            if (tabParam) {
                router.replace(
                    { pathname: router.pathname, query: { ...router.query, tab: defaultTab } },
                    undefined,
                    { shallow: true }
                );
            }
        }
    }, [router.isReady, router.query.tab]);

    const _fetchPermissions = useCallback(async () => {
        const res = await fetchPermissions();
        setPermissions(res);
    }, []);

    const fetchAndCacheDomain = useCallback(
        async (domain: DOMAIN, opts?: { force?: boolean }) => {
            const force = !!opts?.force;
            if (!force && originalContent[domain] !== undefined) {
                setContent(originalContent[domain] as string);
                return;
            }

            setLoading(true);
            try {
                const res = await fetchDomainContent(domain);
                const payload = res ?? "";
                setOriginalContent((prev) => ({ ...prev, [domain]: payload }));
                setContent(payload);
            } catch {
                toast.error(`Failed to load content for ${domain}`);
                setContent("");
            } finally {
                setLoading(false);
            }
        },
        [originalContent]
    );

    useEffect(() => {
        (async () => {
            setLoading(true);
            await loadSession();
            await _fetchPermissions();
            setLoading(false);
        })();
    }, [loadSession, _fetchPermissions]);

    useEffect(() => {
        if (!session) return;
        fetchAndCacheDomain(selectedDomain);
    }, [session, selectedDomain, fetchAndCacheDomain]);

    const saveOverviewContent = useCallback(async () => {
        try {
            const res = await updateDomainContent(selectedDomain, content);
            if (res) {
                setOriginalContent((prev) => ({ ...prev, [selectedDomain]: content }));
                setIsEditing(false);
                toast.success("Saved");
            } else {
                toast.error("Save failed");
            }
        } catch {
            toast.error("Save failed");
        }
    }, [selectedDomain, content]);

    const refreshCurrentDomain = useCallback(() => {
        fetchAndCacheDomain(selectedDomain, { force: true });
    }, [selectedDomain, fetchAndCacheDomain]);

    const isEditor = session?.role && permissions.includes(ACCESS_PERMISSION.EDIT_COMPANY_INFO);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-w-full py-12 bg-gradient-to-r from-cyan-50 to-white border border-cyan-200 rounded-2xl shadow-xl animate-pulse">
                <div className="flex items-center justify-center w-full py-12">
                    <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="mt-4 text-lg font-semibold text-cyan-700">Loading {toTitleCase(selectedDomain)} Prep Content ... </p>
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
            {/* Tabs */}
            <div className="sticky top-0 z-20 bg-[#0c0f11] border-b border-cyan-900 px-2 sm:px-6 py-3 overflow-x-auto whitespace-nowrap flex gap-2 backdrop-blur supports-[backdrop-filter]:bg-[#0c0f11]/90">
                {Object.values(DOMAIN).map((dom) => {
                    const color =
                        DOMAIN_COLORS[dom] ?? { bg: "bg-cyan-900", text: "text-cyan-300", border: "border-cyan-700" };
                    const isSelected = selectedDomain === dom;

                    return (
                        <button
                            key={dom}
                            onClick={() => {
                                setIsEditing(false);
                                router.replace(
                                    { pathname: router.pathname, query: { ...router.query, tab: dom.toLowerCase() } },
                                    undefined,
                                    { shallow: true }
                                );
                            }}
                            className={`
                text-sm px-4 py-1.5 rounded-full font-medium border transition-all duration-200
                ${isSelected
                                    ? `${color.bg} ${color.text} ${color.border} border-transparent shadow-sm`
                                    : `bg-[#0c0f11] text-cyan-100 border-cyan-800 hover:${color.bg} hover:${color.text} hover:${color.border}`
                                }
              `}
                        >
                            {dom}
                        </button>
                    );
                })}
            </div>

            {/* Content editor card */}
            <div
                className="
          group bg-[#0a141d] border border-cyan-900 rounded-2xl shadow-lg
          px-4 sm:px-8 py-0 w-full transition-all duration-300 ease-in-out
          flex flex-col flex-1 min-h-0                  
        "
            >
                <div className="flex flex-col flex-1 min-h-0"> 
                    {isEditor && (
                        <div className="sticky top-0 z-10 border-b border-cyan-800 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-[#0a141d]">
                            <button
                                onClick={refreshCurrentDomain}
                                className="px-4 py-1.5 text-sm rounded-md border border-cyan-500 text-cyan-300 bg-transparent hover:bg-cyan-900/30 hover:shadow-md transition-all duration-200 font-medium flex items-center gap-2"
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                                Refresh
                            </button>

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
                                            setContent(originalContent[selectedDomain] ?? "");
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

                    {/* Editor area fills the rest */}
                    <div className="flex-1 min-h-0 overflow-y-auto pb-6">   {/* ★ grows and scrolls; min-h-0 is critical */}
                        <div className="h-full">                               {/* ★ ensure 100% height for the editor wrapper */}
                            <RichTextPane
                                key={selectedDomain}
                                editable={isEditing}
                                lexicalState={
                                    !isEditing ? (isMobile ? convertListsToParagraphs(content) : content) : content
                                }
                                OnSetContent={(f: string) => setContent(f)}
                                placeholder={isEditor ? "Enter content here..." : "Content not available yet"}
                            // If RichTextPane supports a className or style for its root, you can enforce height too:
                            // className="h-full" or style={{ height: '100%' }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
