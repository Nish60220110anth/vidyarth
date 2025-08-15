import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { ExclamationTriangleIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { RichTextPane } from "../RichTextPane";
import { ACCESS_PERMISSION } from "@prisma/client";
import { OverviewEntry } from "@/types/panes";
import { useIsMobile } from "@/hooks/useMobile";
import { convertListsToParagraphs } from "@/utils/convertListToPara";
import { SessionInfo } from "@/utils/api";
import { fetchOverviewContent, updateOverviewContent } from "@/lib/api/panes/overview";
import { useAuth } from "@/contexts/AuthContext";

export default function Overview({ props }: { props: OverviewEntry }) {
    const isMobile = useIsMobile();
    const {user} = useAuth();

    const [session, setSession] = useState<SessionInfo | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [content, setContent] = useState<string>("");
    const [originalContent, setOriginalContent] = useState<string>("");
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string>("");

    const isEditor = useMemo(
        () => !!session?.role && permissions.includes(ACCESS_PERMISSION.EDIT_COMPANY_INFO),
        [session?.role, permissions]
    );

    const isDirty = content !== originalContent;

    const loadAll = async (companyId: number, silent = false) => {
        if (!companyId) return;
        if (!silent) {
            setLoading(true);
            setError("");
        }
        try {
            const [pRes] = await Promise.all([
                fetchOverviewContent(companyId),
            ]);

            if (!pRes?.success) {
                toast.error(pRes?.error || "Failed to load permissions");
            }

            setSession({
                email: user?.email || "",
                name: user?.name || "",
                role: user?.role || "",
                is_active: user?.is_active || false,
                is_verified: user?.is_verified || false,
            } as SessionInfo);
            setPermissions(user?.permissions || []);
            const text = pRes.data || "";
            setOriginalContent(text);
            setContent(text);
            if (!silent) toast.success("Overview loaded");
        } catch (e: any) {
            setError(e?.message || "Something went wrong");
            if (!silent) toast.error(e?.message || "Failed to load overview");
        } finally {
            setLoading(false);
        }
    };

    const onSave = async () => {
        if (!isDirty) {
            toast("No changes to save");
            setIsEditing(false);
            return;
        }
        setSaving(true);
        try {
            const res = await updateOverviewContent(props.company_id, content);
            if (!res?.success) throw new Error(res?.error || "Save failed");
            setOriginalContent(content);
            setIsEditing(false);
            toast.success("Overview saved");
        } catch (e: any) {
            toast.error(e?.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const onCancel = () => {
        setContent(originalContent);
        setIsEditing(false);
    };

    const onRefresh = async () => {
        await loadAll(props.company_id, true);
        toast.success("Refreshed");
    };

    useEffect(() => {
        loadAll(props.company_id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.company_id]);

    if (loading) {
        return (
            <div className="w-full rounded-2xl border border-cyan-900/40 bg-[#0b1721] shadow-[0_0_30px_rgba(0,255,255,0.06)] p-8 flex flex-col items-center justify-center text-cyan-100">
                <div className="h-14 w-14 border-4 border-cyan-400/90 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-cyan-200">Loading overview…</p>
                <div className="mt-6 w-full max-w-xl space-y-2">
                    <div className="h-3 rounded bg-cyan-900/30 animate-pulse" />
                    <div className="h-3 w-5/6 rounded bg-cyan-900/30 animate-pulse" />
                    <div className="h-3 w-2/3 rounded bg-cyan-900/30 animate-pulse" />
                </div>
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="w-full rounded-2xl border border-red-900/40 bg-[#1a0f12] p-8 text-red-100">
                <div className="flex flex-col items-center text-center gap-3">
                    <ExclamationTriangleIcon className="w-10 h-10 text-red-400" />
                    <h3 className="text-lg font-semibold">Unable to load overview</h3>
                    <p className="text-sm text-red-300">{error || "Please try again."}</p>
                    <button
                        onClick={() => loadAll(props.company_id)}
                        className="mt-2 inline-flex items-center gap-2 rounded-md border border-red-800 bg-red-900/20 px-3 py-1.5 text-sm text-red-200 hover:bg-red-900/30"
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full rounded-2xl border border-cyan-900/40 bg-[#0b1721] text-cyan-50 shadow-[0_0_30px_rgba(0,255,255,0.06)] overflow-hidden">
            <div className="sticky top-0 z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-[#0d1f2b] border-b border-cyan-900/40 px-4 sm:px-6 py-3">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={onRefresh}
                        className="inline-flex items-center gap-2 rounded-md border border-cyan-800 bg-[#0b1721] px-3 py-1.5 text-sm text-cyan-200 hover:bg-[#0f2130]"
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                        Refresh
                    </button>
                    {isEditor && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="rounded-md border border-cyan-700 bg-cyan-600 px-3 py-1.5 text-sm text-white hover:bg-cyan-700"
                        >
                            Edit
                        </button>
                    )}
                    {isEditor && isEditing && (
                        <div className="flex gap-2">
                            <button
                                onClick={onCancel}
                                disabled={saving}
                                className="rounded-md border border-cyan-800 bg-[#0b1721] px-3 py-1.5 text-sm text-cyan-200 hover:bg-[#0f2130] disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onSave}
                                disabled={saving || !isDirty}
                                className={`rounded-md px-3 py-1.5 text-sm text-white ${saving || !isDirty ? "bg-cyan-700/50 cursor-not-allowed" : "bg-cyan-600 hover:bg-cyan-700"}`}
                            >
                                {saving ? "Saving…" : "Save"}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className={`px-4 sm:px-6 py-5 ${isEditing ? "max-h-[560px] overflow-y-auto" : ""}`}>
                <RichTextPane
                    editable={!!isEditing}
                    lexicalState={
                        !isEditing
                            ? isMobile
                                ? convertListsToParagraphs(content)
                                : content
                            : undefined
                    }
                    OnSetContent={setContent}
                    placeholder={isEditor ? "Enter overview…" : "Content not available yet"}
                />
            </div>
        </div>
    );
}
