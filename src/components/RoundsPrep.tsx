import { fetchSession, SessionInfo } from "@/utils/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { RichTextPane } from "./RichTextPane";
import { ACCESS_PERMISSION, ROUND_TYPE } from "@prisma/client";
import { useIsMobile } from "@/hooks/useMobile";
import { convertListsToParagraphs } from "@/utils/convertListToPara";
import { motion } from "framer-motion";
import {
    CheckCircleIcon,
    PencilSquareIcon,
    XCircleIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { fetchRoundPrepContent, updateRoundPrepContent } from "@/lib/api/roundprep";

const ROUND_COLORS: Record<
    ROUND_TYPE | 'DEFAULT',
    { bg: string; text: string; ring: string; border: string }
> = {
    HR: {
        bg: 'bg-fuchsia-900/20',
        text: 'text-fuchsia-300',
        ring: 'ring-fuchsia-600/40',
        border: 'border-fuchsia-600/30',
    },
    PI: {
        bg: 'bg-emerald-900/20',
        text: 'text-emerald-300',
        ring: 'ring-emerald-600/40',
        border: 'border-emerald-600/30',
    },
    GD: {
        bg: 'bg-rose-900/20',
        text: 'text-rose-300',
        ring: 'ring-rose-600/40',
        border: 'border-rose-600/30',
    },
    DEFAULT: {
        bg: 'bg-slate-800/50',
        text: 'text-slate-300',
        ring: 'ring-slate-600/30',
        border: 'border-slate-600/30',
    },
};
export default function RoundPrep() {
    const isMobile = useIsMobile();
    const router = useRouter();
    const { user } = useAuth();

    const [session, setSession] = useState<SessionInfo | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string>("");

    const [originalContent, setOriginalContent] = useState<
        Partial<Record<ROUND_TYPE, string>>
    >({});
    const [selectedRound, setSelectedRound] = useState<ROUND_TYPE>(ROUND_TYPE.GD);
    const [content, setContent] = useState<string>("");

    const [isEditing, setIsEditing] = useState(false);

    const loadSession = useCallback(async () => {
        const res = await fetchSession();
        if (!res.success) {
            toast.error(res.error || "Failed to load session");
            return;
        }
        setSession(res.data);
    }, []);

    useEffect(() => {
        if (!router.isReady) return;

        const rounds = Object.keys(ROUND_TYPE).map((p) => p.toLowerCase());
        const tabParam = (router.query.tab as string | undefined)?.toLowerCase();
        const validTab = rounds.find((p) => p === tabParam);

        if (validTab) {
            setSelectedRound(validTab.toUpperCase() as ROUND_TYPE);
        } else {
            const defaultTab = rounds[0];
            setSelectedRound(defaultTab.toUpperCase() as ROUND_TYPE);

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
        if (user) setPermissions(user.permissions || []);
    }, [user]);

    const fetchAndCacheRound = useCallback(
        async (round: ROUND_TYPE, opts?: { force?: boolean; silent?: boolean }) => {
            const force = !!opts?.force;
            const silent = !!opts?.silent;

            if (!force && originalContent[round] !== undefined) {
                setContent(originalContent[round] as string);
                return;
            }

            if (!silent) {
                setLoading(true);
                setError("");
            }

            try {
                const res = await fetchRoundPrepContent(round);
                if (!res?.success) {
                    const msg = res?.error || `Failed to load content for ${round}`;
                    if (!silent) toast.error(msg);
                    setError(msg);
                    setOriginalContent((prev) => ({ ...prev, [round]: "" }));
                    setContent("");
                    return;
                }

                const payload = res.data || "";
                setOriginalContent((prev) => ({ ...prev, [round]: payload }));
                setContent(payload);
                if (!silent) toast.success("Loaded");
            } catch (e: any) {
                const msg = e?.message || "Something went wrong";
                if (!silent) toast.error(msg);
                setError(msg);
                setContent("");
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [originalContent]
    );

    useEffect(() => {
        (async () => {
            setLoading(true);
            setError("");
            await Promise.all([loadSession(), _fetchPermissions()]);
            setLoading(false);
        })();
    }, [loadSession, _fetchPermissions]);

    useEffect(() => {
        if (!session) return;
        fetchAndCacheRound(selectedRound);
    }, [session, selectedRound, fetchAndCacheRound]);

    const saveDomainContent = useCallback(async () => {
        if (!session) return;
        setSaving(true);
        try {
            const res = await updateRoundPrepContent(selectedRound, content);
            if (!res?.success) {
                toast.error(res?.error || "Save failed");
                return;
            }
            setOriginalContent((prev) => ({ ...prev, [selectedRound]: content }));
            setIsEditing(false);
            toast.success("Saved");
        } catch (e: any) {
            toast.error(e?.message || "Save failed");
        } finally {
            setSaving(false);
        }
    }, [selectedRound, content, session]);

    const refreshCurrentRound = useCallback(async () => {
        setRefreshing(true);
        await fetchAndCacheRound(selectedRound, { force: true, silent: true });
        setRefreshing(false);
        toast.success("Refreshed");
    }, [selectedRound, fetchAndCacheRound]);

    const isEditor =
        !!session?.role && permissions.includes(ACCESS_PERMISSION.EDIT_COMPANY_INFO);

    const isDirty = useMemo(
        () => content !== (originalContent[selectedRound] ?? ""),
        [content, originalContent, selectedRound]
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-w-full py-12 bg-gradient-to-r from-cyan-50 to-white border border-cyan-200 rounded-2xl shadow-xl animate-pulse">
                <div className="flex items-center justify-center w-full py-12">
                    <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="mt-4 text-lg font-semibold text-cyan-700">
                    Loading {selectedRound} Prep Content…
                </p>
                <div className="mt-6 space-y-2 w-3/4">
                    <div className="h-3 bg-gray-200 rounded-full" />
                    <div className="h-3 bg-gray-200 rounded-full w-5/6" />
                    <div className="h-3 bg-gray-200 rounded-full w-2/3" />
                </div>
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="w-full rounded-2xl border border-red-200 bg-red-50 px-6 py-8 shadow-md text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-red-700">Unable to load content</h3>
                <p className="mt-1 text-sm text-red-600">
                    {error || "Something went wrong. Please try again."}
                </p>
                <button
                    onClick={() => fetchAndCacheRound(selectedRound, { force: true })}
                    className="mt-4 inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-100"
                >
                    <ArrowPathIcon className="h-4 w-4" />
                    Retry
                </button>
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
                {Object.values(ROUND_TYPE).map((round) => {
                    const color =
                        ROUND_COLORS[round] ?? {
                            bg: "bg-cyan-900",
                            text: "text-cyan-300",
                            border: "border-cyan-700",
                        };
                    const isSelected = selectedRound === round;

                    return (
                        <button
                            key={round}
                            onClick={() => {
                                setIsEditing(false);
                                setError("");
                                router.replace({
                                    pathname: router.pathname,
                                    query: { ...router.query, tab: round.toLowerCase() },
                                }, undefined, { shallow: true });
                            }}
                            className={`text-sm px-4 py-1.5 rounded-full font-medium border transition-all duration-200 ${isSelected
                                    ? `${color.bg} ${color.text} ${color.border} border-transparent shadow-sm`
                                    : `bg-[#0c0f11] text-cyan-100 border-cyan-800 hover:${color.bg} hover:${color.text} hover:${color.border}`
                                }`}
                        >
                            {round}
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
                                onClick={refreshCurrentRound}
                                disabled={refreshing}
                                className={`px-4 py-1.5 text-sm rounded-md border border-cyan-500 text-cyan-300 bg-transparent transition-all duration-200 font-medium flex items-center gap-2 ${refreshing ? "opacity-70 cursor-not-allowed" : "hover:bg-cyan-900/30 hover:shadow-md"
                                    }`}
                            >
                                <ArrowPathIcon className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                                {refreshing ? "Refreshing…" : "Refresh"}
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
                                <div className="flex flex-col sm:flex-row gap-2 w/full sm:w-auto">
                                    <button
                                        onClick={() => {
                                            setContent(originalContent[selectedRound] ?? "");
                                            setIsEditing(false);
                                        }}
                                        disabled={saving}
                                        className="px-4 py-1.5 text-sm rounded-md border border-red-400 text-red-400 bg-transparent hover:bg-red-800/20 hover:shadow transition-all duration-200 w-full sm:w-auto font-medium flex items-center gap-2 disabled:opacity-60"
                                    >
                                        <XCircleIcon className="w-4 h-4" />
                                        Cancel
                                    </button>
                                    <button
                                        onClick={saveDomainContent}
                                        disabled={saving || !isDirty}
                                        className={`px-4 py-1.5 text-sm rounded-md text-white w-full sm:w-auto font-semibold flex items-center gap-2 ${saving || !isDirty
                                                ? "bg-cyan-700/50 cursor-not-allowed"
                                                : "bg-cyan-600 hover:bg-cyan-700 shadow-sm hover:shadow-md transition-all duration-200"
                                            }`}
                                    >
                                        <CheckCircleIcon className="w-4 h-4 text-white" />
                                        {saving ? "Saving…" : "Save"}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Editor area fills the rest */}
                    <div className="flex-1 min-h-0 overflow-y-auto pb-6">
                        <div className="h-full">
                            <RichTextPane
                                key={selectedRound}
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
            </div>
        </motion.div>
    );
}
