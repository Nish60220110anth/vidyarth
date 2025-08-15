import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DocumentTextIcon, ArrowDownTrayIcon, StarIcon } from "@heroicons/react/24/solid";
import { DOMAIN, student_cv } from "@prisma/client";
import toast from "react-hot-toast";
import { toTitleCase } from "./Profile";
import { fetchCVFile, fetchCVForUserID, putStudentCV } from "@/lib/api/studentCV";
import { useRouter } from "next/router";
import { baseUrl } from "@/lib/config";
import { useAuth } from "@/contexts/AuthContext";

type CVEntry = student_cv;

type Props = {
    name: string;
    email: string;
    role: string;
    id: number;
};

type CVEntryProp = { comment?: string; domain?: string };

export default function MyCV({ id, name }: Props) {
    const router = useRouter();
    const { basePath } = router;

    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [cvs, setCvs] = useState<CVEntry[]>([]);
    const [editing, setEditing] = useState<number | null>(null);

    const [originalData, setOriginalData] = useState<Record<number, CVEntryProp>>({});
    const [currentData, setCurrentData] = useState<Record<number, CVEntryProp>>({});

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setLoading(true);
                const fetched = await fetchCVForUserID(basePath, id);
                if (!mounted) return;
                setCvs(fetched);

                const seed: Record<number, CVEntryProp> = {};
                fetched.forEach((cv: any) => {
                    seed[cv.id] = { comment: cv.comment || undefined, domain: cv.domain || undefined };
                });
                setOriginalData(seed);
                setCurrentData(seed);
            } catch (err: any) {
                toast.error(err?.message || "Failed to load CVs");
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [id, basePath]);

    const primaryCV = useMemo(() => cvs.find(cv => cv.is_primary), [cvs]);
    const otherCVs = useMemo(() => cvs.filter(cv => !cv.is_primary), [cvs]);

    const handleDownload = async (cv: CVEntry) => {
        let download_filename = cv.cv_filename;
        if (cv.is_primary) {
            download_filename = `${user?.pcomid}_${toTitleCase(user?.name || "")}_CV_Primary.pdf`;
        }
        try {
            const url = await fetchCVFile(basePath, cv.cv_path);
            const a = document.createElement("a");
            a.href = url;
            a.download = download_filename;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            toast.error("Couldn’t download CV");
        }
    };

    const handleGenericDownload = () => {
        const url = `${baseUrl}/generic/John Doe CV.docx`;
        const a = document.createElement("a");
        a.href = url;
        a.download = `${toTitleCase(name)}_John_CV.docx`;
        a.click();
    };

    const startEdit = (cv_id: number) => {
        setEditing(cv_id);
        const fromOriginal = originalData[cv_id];
        if (fromOriginal) {
            setCurrentData(prev => ({ ...prev, [cv_id]: { ...fromOriginal } }));
        } else {
            const cv = cvs.find(c => c.id === cv_id);
            if (cv) {
                setCurrentData(prev => ({
                    ...prev,
                    [cv_id]: { comment: cv.comment || undefined, domain: cv.domain || undefined },
                }));
            }
        }
    };

    const handleSave = async (cv_id: number) => {
        try {
            const { domain, comment } = currentData[cv_id] || {};
            await putStudentCV(basePath, cv_id, domain, comment);
            setEditing(null);
            setOriginalData(prev => ({ ...prev, [cv_id]: { comment, domain } }));
            toast.success("Saved");
        } catch {
            toast.error("Failed to save changes");
        }
    };

    const handleCancel = (cv_id: number) => {
        setEditing(null);
        setCurrentData(prev => ({ ...prev, [cv_id]: originalData[cv_id] || {} }));
    };

    const onComment = (e: React.ChangeEvent<HTMLInputElement>, cv_id: number) => {
        const val = e.target.value;
        setCurrentData(prev => ({ ...prev, [cv_id]: { ...prev[cv_id], comment: val } }));
    };

    const onDomain = (e: React.ChangeEvent<HTMLSelectElement>, cv_id: number) => {
        const val = e.target.value;
        setCurrentData(prev => ({ ...prev, [cv_id]: { ...prev[cv_id], domain: val } }));
    };

    const dirty = (cv_id: number) => {
        const o = originalData[cv_id] || {};
        const c = currentData[cv_id] || {};
        return (o.comment || "") !== (c.comment || "") || (o.domain || "") !== (c.domain || "");
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-b from-[#0b1520] via-[#0a141d] to-[#0b1520] text-cyan-100">
            <div className="mx-auto max-w-6xl px-4 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-cyan-300">My CVs</h2>
                    </div>
                    <button
                        onClick={handleGenericDownload}
                        className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-[#0a141d] shadow hover:bg-cyan-300 transition"
                    >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                        Download John Doe CV
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => (
                            <div
                                key={i}
                                className="h-32 rounded-2xl bg-[#0b1014]/90 border border-cyan-900/60 animate-pulse"
                            />
                        ))}
                    </div>
                ) : cvs.length === 0 ? (
                    <div className="rounded-2xl border border-cyan-900/50 bg-[#0b1014]/80 p-8 text-center">
                        <p className="text-cyan-300/80">No CVs uploaded yet.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <AnimatePresence>
                            {primaryCV && (
                                <motion.div
                                    key={primaryCV.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="rounded-2xl border border-cyan-700/60 bg-gradient-to-br from-[#0c1822] to-[#0f1f2b] p-5 shadow-[0_0_24px_rgba(0,255,255,0.10)]"
                                >
                                    <div className="mb-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                                                <StarIcon className="h-3.5 w-3.5" /> Primary
                                            </span>
                                            <span className="text-sm text-cyan-300/80">{`${user?.pcomid}_${toTitleCase(user?.name || "")}_CV_Primary.pdf`}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDownload(primaryCV)}
                                            className="inline-flex items-center gap-2 rounded-lg border border-cyan-700/60 bg-[#0a141d] px-3 py-1.5 text-sm text-cyan-200 hover:bg-[#0e1e2b] transition"
                                        >
                                            <ArrowDownTrayIcon className="h-4 w-4" /> Download
                                        </button>
                                    </div>

                                    {(primaryCV.comment || primaryCV.domain) && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                            <div className="flex gap-2">
                                                <span className="text-cyan-300/70 min-w-[70px]">Domain:</span>
                                                <span className="text-cyan-100">
                                                    {primaryCV.domain ? toTitleCase(primaryCV.domain) : <span className="text-cyan-400/60 italic">Not specified</span>}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="text-cyan-300/70 min-w-[70px]">Comment:</span>
                                                <span className="text-cyan-100">
                                                    {primaryCV.comment || <span className="text-cyan-400/60 italic">No comment</span>}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {otherCVs.length > 0 && (
                            <div>
                                <h3 className="mb-3 text-cyan-300 font-semibold">Other CVs</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {otherCVs.map(cv => {
                                        const isEditing = editing === cv.id;
                                        const current = currentData[cv.id] || {};
                                        const isDirty = dirty(cv.id);

                                        return (
                                            <motion.div
                                                key={cv.id}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="rounded-2xl border border-cyan-900/60 bg-[#0b1014]/90 p-5 shadow hover:shadow-[0_0_24px_rgba(0,255,255,0.08)] transition"
                                            >
                                                <div className="mb-3 flex items-center gap-3">
                                                    <DocumentTextIcon className="h-6 w-6 text-cyan-400" />
                                                    <div className="truncate">
                                                        <p className="font-semibold text-cyan-100 truncate">{cv.cv_filename}</p>
                                                    </div>
                                                </div>

                                                {isEditing ? (
                                                    <div className="space-y-3">
                                                        <select
                                                            value={current.domain || ""}
                                                            onChange={e => onDomain(e, cv.id)}
                                                            className="w-full rounded-lg border border-cyan-900/60 bg-[#0f1822] px-3 py-2 text-sm text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                                                        >
                                                            <option value="">Select Domain</option>
                                                            {Object.keys(DOMAIN).map(d => (
                                                                <option key={d} value={d}>
                                                                    {d}
                                                                </option>
                                                            ))}
                                                        </select>

                                                        <input
                                                            type="text"
                                                            value={current.comment || ""}
                                                            onChange={e => onComment(e, cv.id)}
                                                            placeholder="Add a comment"
                                                            className="w-full rounded-lg border border-cyan-900/60 bg-[#0f1822] px-3 py-2 text-sm text-cyan-100 placeholder-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                                                        />

                                                        <div className="flex gap-2 pt-1">
                                                            <button
                                                                onClick={() => handleSave(cv.id)}
                                                                disabled={!isDirty}
                                                                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${isDirty
                                                                    ? "bg-cyan-400 text-[#0a141d] hover:bg-cyan-300"
                                                                    : "bg-cyan-900/40 text-cyan-300/70 cursor-not-allowed"
                                                                    }`}
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={() => handleCancel(cv.id)}
                                                                className="flex-1 rounded-lg border border-cyan-900/60 bg-[#0a141d] px-4 py-2 text-sm text-cyan-200 hover:bg-[#0e1e2b] transition"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex gap-2">
                                                                <span className="text-cyan-300/70 min-w-[70px]">Domain:</span>
                                                                <span className="text-cyan-100">
                                                                    {current.domain ? toTitleCase(current.domain) : (
                                                                        <span className="italic text-cyan-400/60">Not specified</span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <span className="text-cyan-300/70 min-w-[70px]">Comment:</span>
                                                                <span className="text-cyan-100">
                                                                    {current.comment ? current.comment : (
                                                                        <span className="italic text-cyan-400/60">No comment</span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="mt-3 flex gap-2">
                                                            <button
                                                                onClick={() => startEdit(cv.id)}
                                                                className="flex-1 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-[#0a141d] hover:bg-cyan-300 transition"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownload(cv)}
                                                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-900/60 bg-[#0a141d] px-4 py-2 text-sm text-cyan-200 hover:bg-[#0e1e2b] transition"
                                                            >
                                                                <ArrowDownTrayIcon className="h-4 w-4" />
                                                                Download
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
