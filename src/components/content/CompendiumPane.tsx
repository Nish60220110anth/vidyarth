import { fetchSession, SessionInfo } from "@/utils/api";
import { useEffect, useRef, useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { RichTextPane } from "../RichTextPane";
import axios from "axios";
import { ACCESS_PERMISSION } from "@prisma/client";
import { CompendiumEntry } from "@/types/panes";
import {
    DocumentArrowUpIcon,
    ExclamationTriangleIcon,
    EyeIcon,
    PlusIcon,
    TrashIcon,
    ArrowPathIcon,
} from "@heroicons/react/24/solid";
import { AnimatePresence, motion } from "framer-motion";
import { useIsMobile } from "@/hooks/useMobile";
import { convertListsToParagraphs } from "@/utils/convertListToPara";
import { openPdfInAppViewer } from "@/utils/openPdfInViewer";
import { baseUrl } from "@/lib/config";
import {
    fetchCompendiumByCompanyID,
    updateCompendium,
} from "@/lib/api/panes/compendium";
import { useAuth } from "@/contexts/AuthContext";

const getFileTypeFromPath = (path: string): "pdf" | "docx" | "doc" | "unknown" => {
    if (!path) return "unknown";
    const ext = path.split(".").pop()?.toLowerCase();
    return ext === "pdf" || ext === "docx" || ext === "doc" ? ext : "unknown";
};

export default function Compendium({ props }: { props: CompendiumEntry }) {
    const isMobile = useIsMobile();
    const { user } = useAuth();

    const [session, setSession] = useState<SessionInfo | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [originalValue, setOriginalValue] = useState<{
        content: string;
        pdfs: {
            id: number;
            compendium_id: number;
            pdf_name: string;
            pdf_path: string;
            firebase_path: string;
            type: string;
        }[];
    }>({
        content: "",
        pdfs: [],
    });

    const [content, setContent] = useState<string>("");

    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [uploadedNames, setUploadedNames] = useState<string[]>([]);
    const [deletedPdfs, setDeletedPdfs] = useState<number[]>([]);

    const [isEditing, setIsEditing] = useState(false);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadPercent, setUploadPercent] = useState<number>(0);
    const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
    const [uploadMode, setUploadMode] = useState<"uploading" | "deleting" | "done">("done");
    const [showDocs, setShowDocs] = useState(true);

    const [hasFetched, setHasFetched] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const visiblePDFs = originalValue.pdfs.filter((pdf) => !deletedPdfs.includes(pdf.id));
    const isSaveDisabled =
        uploadedFiles.length === 0 &&
        deletedPdfs.length === 0 &&
        content === originalValue.content;

    const isEditor = useMemo(
        () => !!session?.role && permissions.includes(ACCESS_PERMISSION.EDIT_COMPANY_INFO),
        [session?.role, permissions]
    );

    /* ----------------------------- Loaders / helpers ---------------------------- */

    const loadSession = async () => {
        const res = await fetchSession();
        if (!res.success) {
            toast.error(res.error || "Failed to load session");
            return;
        }
        setSession(res.data);
    };

    const _fetchPermissions = async () => {
        setPermissions(user?.permissions || []);
    };

    const _fetchCompendium = async (company_id: number, silent = false) => {
        if (!company_id) return;
        if (!silent) {
            setLoading(true);
            setError("");
        }
        try {
            const res = await fetchCompendiumByCompanyID(company_id);
            if (!res?.success) {
                const msg = res?.error || "Failed to load compendium";
                if (!silent) toast.error(msg);
                setOriginalValue({ content: "", pdfs: [] });
                setContent("");
                setError(msg);
                return;
            }

            const data = res.data || { content: "", pdfs: [] };
            setContent(data.content || "");
            setOriginalValue({
                content: data.content || "",
                pdfs: (Array.isArray(data.pdfs) ? data.pdfs : []).map((pdf: any) => ({
                    id: pdf.id,
                    compendium_id: pdf.compendium_id,
                    pdf_name: pdf.pdf_name,
                    pdf_path: pdf.pdf_path,
                    firebase_path: pdf.firebase_path,
                    type: getFileTypeFromPath(pdf.firebase_path),
                })),
            });

            setUploadedFiles([]);
            setUploadedNames([]);
            setDeletedPdfs([]);
            if (!silent) toast.success("Compendium loaded");
        } catch (e: any) {
            const msg = e?.message || "Something went wrong";
            setError(msg);
            if (!silent) toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const refresh = async () => {
        await _fetchCompendium(props.company_id, true);
        toast.success("Refreshed");
    };

    const deletePdf = (compendPdfId?: number, name?: string) => {
        if (name && uploadedNames.includes(name)) {
            const index = uploadedNames.indexOf(name);
            setUploadedNames((prev) => prev.filter((_, i) => i !== index));
            setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
            return;
        }
        if (compendPdfId && originalValue.pdfs.some((p) => p.id === compendPdfId)) {
            setDeletedPdfs((prev) => [...prev, compendPdfId]);
            return;
        }
        console.error("Invalid pdf id or name");
    };

    /* --------------------------------- Effects -------------------------------- */

    useEffect(() => {
        if (!props.company_id || hasFetched) return;

        const init = async () => {
            setLoading(true);
            await Promise.all([loadSession(), _fetchPermissions(), _fetchCompendium(props.company_id)]);
            setHasFetched(true);
            setLoading(false);
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.company_id, hasFetched]);

    /* --------------------------------- Save flow -------------------------------- */

    const saveCompendium = async () => {
        const company_id = props.company_id;
        setIsUploading(true);
        setUploadPercent(0);
        setCurrentFileIndex(0);

        let ok = true;

        // 1) Deletions only
        if (deletedPdfs.length > 0) {
            setUploadMode("deleting");
            const baseFormData = new FormData();
            baseFormData.append("cid", String(company_id));
            baseFormData.append("content", content);
            baseFormData.append("total_new_entries", "0");
            baseFormData.append("total_deleted_entries", String(deletedPdfs.length));
            deletedPdfs.forEach((id, i) => baseFormData.append(`pdf_deleted_id_${i + 1}`, String(id)));

            const delRes = await updateCompendium(company_id, baseFormData);
            if (!delRes?.success) {
                ok = false;
                toast.error(delRes?.error || "Failed to delete documents");
            }
            setUploadMode("done");
        }

        // 2) Content-only update (no new files)
        if (uploadedFiles.length === 0) {
            const formData = new FormData();
            formData.append("cid", String(company_id));
            formData.append("content", content);
            formData.append("total_new_entries", "0");
            formData.append("total_deleted_entries", "0");

            const updRes = await updateCompendium(company_id, formData);
            if (!updRes?.success) {
                ok = false;
                toast.error(updRes?.error || "Failed to save content");
            }

            setUploadPercent(100);
            setTimeout(() => setIsUploading(false), 400);
        } else {
            // 3) Upload files one by one (keep axios here for progress)
            setUploadMode("uploading");
            for (let i = 0; i < uploadedFiles.length; i++) {
                setCurrentFileIndex(i);

                const formData = new FormData();
                formData.append("cid", String(company_id));
                formData.append("content", content);
                formData.append("total_new_entries", "1");
                formData.append("pdf_new_file_1", uploadedFiles[i]);
                formData.append("pdf_new_name_1", uploadedNames[i]);
                formData.append("total_deleted_entries", "0");

                try {
                    const out = await axios.put(`${baseUrl}/api/compendium`, formData, {
                        headers: {
                            "Content-Type": "multipart/form-data",
                            "x-access-permission": ACCESS_PERMISSION.MANAGE_MY_COHORT,
                        },
                        onUploadProgress: (ev) => {
                            if (!ev.total) return;
                            const percent = Math.round((ev.loaded * 100) / ev.total);
                            const overall = Math.round(((i + percent / 100) / uploadedFiles.length) * 100);
                            setUploadPercent(overall);
                        },
                        validateStatus: () => true,
                    });

                    if (out.status !== 200 || !out.data?.success) {
                        ok = false;
                        toast.error(out.data?.error || `Upload failed for ${uploadedNames[i]}`);
                        break;
                    }
                } catch {
                    ok = false;
                    toast.error(`Upload failed for ${uploadedNames[i]}`);
                    break;
                }
            }
            setUploadPercent(100);
            setTimeout(() => setIsUploading(false), 400);
        }

        if (ok) {
            toast.success("Compendium saved");
            await _fetchCompendium(props.company_id, true);
            setUploadedFiles([]);
            setUploadedNames([]);
            setDeletedPdfs([]);
        }

        setIsEditing(false);
    };

    /* --------------------------------- UI states -------------------------------- */

    if (loading) {
        return (
            <div className="w-full rounded-2xl border border-cyan-900/40 bg-[#0b1721] shadow-[0_0_30px_rgba(0,255,255,0.06)] p-8 flex flex-col items-center justify-center text-cyan-100">
                <div className="h-14 w-14 border-4 border-cyan-400/90 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-cyan-200">Loading compendium...</p>
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
            <div className="flex flex-col items-center justify-center w-full min-h-[200px] bg-gradient-to-br from-red-50 to-white border border-red-200 rounded-2xl shadow-lg px-6 py-8">
                <ExclamationTriangleIcon className="w-12 h-12 text-red-500 animate-bounce" />
                <h3 className="mt-4 text-2xl font-semibold text-red-600">Unable to Load Content</h3>
                <p className="mt-2 text-red-500 text-center">
                    {error || "Something went wrong on our end. Please try again."}
                </p>
                <button
                    onClick={() => _fetchCompendium(props.company_id)}
                    className="mt-4 inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                    <ArrowPathIcon className="w-4 h-4" />
                    Retry
                </button>
            </div>
        );
    }

    const allDeleted = originalValue.pdfs.every((pdf) => deletedPdfs.includes(pdf.id));

    return (
        <div className="w-full relative">
            {/* Top actions */}
            <div className="w-full flex items-center justify-end gap-2 mb-3">
                <button
                    onClick={refresh}
                    className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                    title="Refresh compendium"
                >
                    <ArrowPathIcon className="w-4 h-4" />
                    Refresh
                </button>

                <button
                    onClick={() => setShowDocs((prev) => !prev)}
                    className="flex items-center gap-1 text-sm px-3 py-1 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition-all"
                >
                    {showDocs ? (
                        <>
                            <span>Hide Documents</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </>
                    ) : (
                        <>
                            <span>Show Documents</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </>
                    )}
                </button>
            </div>

            {/* Grid: Documents + Editor */}
            <div className="grid grid-cols-1 gap-3 w-full">
                {/* Documents */}
                <AnimatePresence initial={false}>
                    {showDocs && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.25 }}
                            className="w-full bg-white border border-gray-300 rounded-xl shadow relative overflow-hidden"
                        >
                            {/* Floating Action Bar (edit mode) */}
                            {isEditing && (
                                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 flex items-center justify-between gap-2 px-4 py-2">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 rounded-lg hover:bg-cyan-50 transition group active:scale-95"
                                        title="Upload file"
                                    >
                                        <PlusIcon className="w-5 h-5 text-cyan-600 group-hover:scale-110 group-hover:text-cyan-800 transition-transform" />
                                    </button>
                                    <button
                                        disabled={allDeleted}
                                        onClick={() => {
                                            const remainingIds = originalValue.pdfs
                                                .filter((pdf) => !deletedPdfs.includes(pdf.id))
                                                .map((pdf) => pdf.id);
                                            setDeletedPdfs((prev) => [...prev, ...remainingIds]);
                                        }}
                                        className="p-2 rounded-lg hover:bg-red-50 transition group disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                                        title="Delete all"
                                    >
                                        <TrashIcon className="w-5 h-5 text-red-500 group-hover:scale-110 group-hover:text-red-700 transition-transform" />
                                    </button>

                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                        ref={fileInputRef}
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            const newFiles = Array.from(e.target.files || []);
                                            const base = (n: string) => n.replace(/\.(pdf|docx|doc)$/i, "");
                                            setUploadedFiles((prev) => [...prev, ...newFiles]);
                                            setUploadedNames((prev) => [...prev, ...newFiles.map((f) => base(f.name))]);
                                        }}
                                    />
                                </div>
                            )}

                            {/* Header */}
                            <div className="px-4 pt-4 pb-2 border-b border-gray-200 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
                                <span className="text-xs text-gray-500">
                                    {visiblePDFs.length + uploadedFiles.length} item
                                    {(visiblePDFs.length + uploadedFiles.length) !== 1 ? "s" : ""}
                                </span>
                            </div>

                            {/* Scrollable PDF Grid */}
                            <div className="max-h-[480px] px-4 py-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-500">
                                {visiblePDFs.length === 0 && uploadedFiles.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center text-gray-400 text-sm text-center py-12">
                                        <DocumentArrowUpIcon className="w-8 h-8 mb-2" />
                                        <p>No documents available.</p>
                                    </div>
                                ) : null}

                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-3 auto-rows-fr">
                                    {/* Existing PDFs */}
                                    {originalValue.pdfs.map((pdf) => {
                                        const isDeleted = deletedPdfs.includes(pdf.id);
                                        const canOpen = !isDeleted && !isEditing;

                                        return (
                                            <motion.div
                                                key={pdf.id}
                                                whileHover={canOpen ? { y: -2 } : undefined}
                                                whileTap={canOpen ? { scale: 0.98 } : undefined}
                                                onClick={() => {
                                                    if (canOpen) openPdfInAppViewer(pdf.pdf_path);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (canOpen && (e.key === "Enter" || e.key === " ")) {
                                                        e.preventDefault();
                                                        openPdfInAppViewer(pdf.pdf_path);
                                                    }
                                                }}
                                                role={canOpen ? "button" : undefined}
                                                tabIndex={canOpen ? 0 : -1}
                                                className={[
                                                    "group relative rounded-lg border p-3 shadow-sm transition-all",
                                                    "bg-white hover:bg-gray-50",
                                                    "flex flex-col justify-between min-h-[100px]",
                                                    "outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60",
                                                    isDeleted ? "bg-red-50 border-red-200 opacity-80" : "border-gray-200",
                                                    canOpen ? "cursor-pointer hover:shadow-md" : "cursor-default",
                                                ].join(" ")}
                                            >
                                                {/* Top: type + actions */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" opacity=".2" />
                                                            <path d="M14 2v6h6M8 13h8M8 17h8M8 9h4" />
                                                        </svg>
                                                        <span className="text-[11px] uppercase tracking-wide text-gray-500">{pdf.type}</span>
                                                    </div>

                                                    <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                        {!isDeleted && (
                                                            <EyeIcon
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openPdfInAppViewer(pdf.pdf_path);
                                                                }}
                                                                className="w-5 h-5 text-cyan-600 hover:text-cyan-800 hover:scale-110 transition-transform cursor-pointer"
                                                                title="Preview"
                                                            />
                                                        )}
                                                        {isEditing && (
                                                            <TrashIcon
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deletePdf(pdf.id);
                                                                }}
                                                                className={[
                                                                    "w-5 h-5 hover:scale-110 transition-transform cursor-pointer",
                                                                    isDeleted ? "text-gray-400" : "text-red-500 hover:text-red-700",
                                                                ].join(" ")}
                                                                title="Delete"
                                                            />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Name */}
                                                <div className="mt-2">
                                                    <div
                                                        className={[
                                                            "text-sm font-medium text-gray-800",
                                                            isDeleted ? "line-through text-red-600/80" : "",
                                                        ].join(" ")}
                                                        title={pdf.pdf_name}
                                                        style={{
                                                            display: "-webkit-box",
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: "vertical",
                                                            overflow: "hidden",
                                                        }}
                                                    >
                                                        {pdf.pdf_name}
                                                    </div>
                                                </div>

                                                {canOpen && (
                                                    <div className="mt-1 h-[2px] w-0 group-hover:w-full transition-all duration-300 bg-cyan-200/60 rounded-full" />
                                                )}

                                                {isDeleted && (
                                                    <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                                                        Marked for deletion
                                                    </span>
                                                )}
                                            </motion.div>
                                        );
                                    })}

                                    {/* New uploads */}
                                    {isEditing &&
                                        uploadedFiles.map((f, idx) => {
                                            const baseName = f.name.replace(/\.(pdf|docx|doc)$/i, "");
                                            return (
                                                <motion.div
                                                    key={`new-${idx}`}
                                                    whileHover={{ y: -2 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    className="group relative rounded-lg border p-3 shadow-sm transition-all bg-cyan-50 hover:bg-cyan-100 hover:shadow-md border-cyan-200 flex flex-col justify-between min-h-[100px] text-cyan-900 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" opacity=".2" />
                                                                <path d="M14 2v6h6M8 13h8M8 17h8M8 9h4" />
                                                            </svg>
                                                            <span className="text-[11px] uppercase tracking-wide">
                                                                {getFileTypeFromPath(f.name)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                            <TrashIcon
                                                                onClick={() => deletePdf(undefined, baseName)}
                                                                className="w-4 h-4 text-red-600 hover:text-red-700 hover:scale-110 transition-transform cursor-pointer"
                                                                title="Remove"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="mt-2">
                                                        <div
                                                            className="text-sm font-medium"
                                                            title={baseName}
                                                            style={{
                                                                display: "-webkit-box",
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: "vertical",
                                                                overflow: "hidden",
                                                            }}
                                                        >
                                                            {baseName}
                                                        </div>
                                                    </div>

                                                    <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded bg-white text-cyan-700 border border-cyan-300">
                                                        New
                                                    </span>
                                                </motion.div>
                                            );
                                        })}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Editor */}
                <div className="w-full">
                    <div className="w-full rounded-xl bg-white border border-gray-200 shadow-[0_2px_10px_rgba(0,0,0,0.05)] px-2 sm:px-2 py-3 space-y-4 ring-1 ring-inset ring-gray-100 backdrop-blur-sm transition-all duration-300 ease-in-out">
                        {isEditor && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="col-span-full flex flex-col sm:flex-row justify-end items-start sm:items-center border-b border-gray-300 pb-3 gap-2"
                            >
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="w-full sm:w-auto px-4 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 hover:shadow-sm active:scale-95 transition-all"
                                    >
                                        Edit
                                    </button>
                                ) : (
                                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                        <button
                                            onClick={() => {
                                                setIsEditing(false);
                                                if (uploadedFiles.length) {
                                                    setUploadedFiles([]);
                                                    setUploadedNames([]);
                                                }
                                                if (deletedPdfs.length) {
                                                    setDeletedPdfs([]);
                                                }
                                                if (content !== originalValue.content) {
                                                    setContent(originalValue.content);
                                                }
                                            }}
                                            className="px-4 py-1.5 text-sm rounded-md border border-red-200 text-red-600 hover:bg-red-50 hover:shadow-sm active:scale-95 transition-all w-full sm:w-auto"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            disabled={isSaveDisabled || isUploading}
                                            onClick={saveCompendium}
                                            className="px-4 py-1.5 text-sm rounded-md bg-cyan-600 text-white hover:bg-cyan-700 hover:shadow-md active:scale-95 transition-all disabled:opacity-60 w-full sm:w-auto"
                                        >
                                            Save
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            layout
                            className="rounded-lg bg-gray-50 border border-gray-200 p-3"
                        >
                            <RichTextPane
                                editable={isEditing}
                                lexicalState={
                                    !isEditing ? (isMobile ? convertListsToParagraphs(content) : content) : undefined
                                }
                                OnSetContent={setContent}
                                placeholder={isEditor ? "Enter content here..." : "Content not available yet"}
                            />
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Uploading overlay */}
            {isUploading && (
                <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in text-center px-6">
                    <div className="relative w-16 h-16 mb-4">
                        {uploadMode !== "deleting" ? (
                            <div
                                className="absolute inset-0 rounded-full animate-spin"
                                style={{
                                    background: `conic-gradient(rgba(0,255,255,0.9) ${uploadPercent}%, rgba(0,255,255,0.1) ${uploadPercent}%)`,
                                    maskImage: "radial-gradient(circle at center, transparent 65%, black 66%)",
                                    WebkitMaskImage: "radial-gradient(circle at center, transparent 60%, black 60%)",
                                    boxShadow: "0 0 12px rgba(0,255,255,0.5)",
                                }}
                            />
                        ) : (
                            <div
                                className="absolute inset-1.5 rounded-full border-[3px] border-red-400 animate-spin"
                                style={{ boxShadow: "0 0 10px rgba(255, 100, 100, 0.5)" }}
                            />
                        )}
                    </div>

                    {uploadMode === "uploading" ? (
                        <>
                            <p className="text-cyan-200 text-base sm:text-lg font-medium animate-pulse px-4 text-center">
                                Uploading file {currentFileIndex + 1} of {uploadedFiles.length}
                            </p>
                            <p className="text-cyan-300 text-sm">{uploadPercent}% completed</p>
                        </>
                    ) : uploadMode === "deleting" && uploadedFiles.length === 0 ? (
                        <p className="text-cyan-200 text-base sm:text-lg font-medium animate-pulse px-4 text-center">
                            Deleting {deletedPdfs.length} file{deletedPdfs.length > 1 ? "s" : ""}…
                        </p>
                    ) : (
                        <p className="text-cyan-200 text-base sm:text-lg font-medium animate-pulse px-4 text-center">
                            Finalizing…
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
