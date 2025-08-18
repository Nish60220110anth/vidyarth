// components/ManageCompaniesList.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import Image from "next/image";
import axios from "axios";
import toast from "react-hot-toast";
import ExcelJS from "exceljs";
import {
    ChevronUpIcon,
    ChevronDownIcon,
    PlusIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import {
    ArrowPathIcon,
    ArrowUpTrayIcon,
    CheckCircleIcon,
    CheckIcon,
    PencilIcon,
    TrashIcon,
    XCircleIcon,
} from "@heroicons/react/24/solid";
import { debounce } from "lodash";
import { fetchCompanyListWithPermission } from "@/lib/api/company";
import { ACCESS_PERMISSION } from "@prisma/client";

interface Company {
    id: number;
    company_name: string;
    company_full: string;
    logo_url?: string;
    firebase_path: string;
    domains: { domain: string }[];
    updated_at?: string;
    created_at?: string;
    is_featured: boolean;
    is_legacy: boolean;
}

type SortKey = "company_name" | "company_full";

export const ALL_DOMAINS = ["CONSULTING", "FINANCE", "MARKETING", "PRODMAN", "GENMAN", "OPERATIONS"];

export const DOMAIN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    FINANCE: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
    MARKETING: { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-300" },
    CONSULTING: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
    PRODMAN: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300" },
    OPERATIONS: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
    GENMAN: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
};

const TOAST = {
    loadFail: "Could not load companies",
    created: "Company created",
    createFail: "Could not create company",
    saved: "Saved changes",
    saveFail: "Could not save changes",
    deleted: "Deleted",
    deleteFail: "Could not delete company",
    logoFail: "Could not upload logo",
};

export default function ManageCompanyList() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [allCompanies, setAllCompanies] = useState<Company[]>([]);
    const [editId, setEditId] = useState<number | null>(null);
    const [domainMenuOpenId, setDomainMenuOpenId] = useState<number | null>(null);

    const [editedLogoFile, setEditedLogoFile] = useState<File | null>(null);

    const [originalCompany, setOriginalCompany] = useState<Partial<Company>>({});
    const [editedCompany, setEditedCompany] = useState<Partial<Company>>({});
    const [sortKey, setSortKey] = useState<SortKey>("company_name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [editedDomains, setEditedDomains] = useState<string[]>([]);
    const [updatedCompanyIds, setUpdatedCompanyIds] = useState<Set<number>>(new Set());
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [newCompanyId, setNewCompanyId] = useState<number | null>(null);
    const [selectedDomain, setSelectedDomain] = useState<string>("ALL");
    const [isRefreshing, setIsRefreshing] = useState(false);

    const { basePath } = useRouter();
    const previewUrlRef = useRef<string | null>(null);

    const uploadExcelRef = useRef<HTMLInputElement | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);


    const didInitRef = useRef(false);
    const inFlightFetchRef = useRef<Promise<void> | null>(null);

    useEffect(() => {
        if (editId === newCompanyId && inputRef.current) inputRef.current.focus();
    }, [editId, newCompanyId]);

    useEffect(() => {
        if (newCompanyId !== null) {
            const timeout = setTimeout(() => setNewCompanyId(null), 3000);
            return () => clearTimeout(timeout);
        }
    }, [newCompanyId]);

    useEffect(() => {
        if (editId && editedCompany.is_legacy && !editedCompany.is_featured) {
            setEditedCompany((prev) => ({ ...prev, is_featured: true }));
        }
    }, [editId, editedCompany.is_legacy, editedCompany.is_featured]);

    const mergeById = (prev: Company[], next: Company[]) => {
        const map = new Map(prev.map((c) => [c.id, c]));
        next.forEach((c) => map.set(c.id, c));
        return Array.from(map.values());
    };

    const fetchCompanies = useCallback(
        async (domainOverride?: string) => {
            if (inFlightFetchRef.current) return inFlightFetchRef.current;

            const p = (async () => {
                try {
                    setIsRefreshing(true);

                    let fetchedCompanies: Company[] = [];
                    if (updatedCompanyIds.size > 0) {
                        const ids = Array.from(updatedCompanyIds);
                        const res = await axios.post(`${basePath}/api/company/fetch-multiple`, { ids }, {
                            headers: { "x-access-permission": ACCESS_PERMISSION.MANAGE_COMPANY_LIST },
                        });

                        if (!res.data.success) {
                            toast.error(`Failed to fetch companies: ${res.data.error}`);
                            return;
                        }

                        fetchedCompanies = res.data.data;
                    } else {
                        const res = await fetchCompanyListWithPermission(ACCESS_PERMISSION.MANAGE_COMPANY_LIST);

                        if (res.success) {
                            fetchedCompanies = res.data;
                        } else {
                            toast.error(`Failed to fetch companies: ${res.error}`);
                            return;
                        }
                    }

                    const domainToUse = domainOverride || selectedDomain;

                    setAllCompanies((prev) =>
                        updatedCompanyIds.size > 0 ? mergeById(prev, fetchedCompanies) : fetchedCompanies
                    );

                    setCompanies((prev) => {
                        const base =
                            updatedCompanyIds.size > 0 ? mergeById(prev, fetchedCompanies) : fetchedCompanies;
                        return domainToUse === "ALL"
                            ? base
                            : base.filter((c) => c.domains.some((d) => d.domain === domainToUse));
                    });

                    if (updatedCompanyIds.size > 0) setUpdatedCompanyIds(new Set());
                } catch (err: any) {
                    toast.error(`Failed to fetch companies: ${err.message}`);
                    return;
                } finally {
                    setIsRefreshing(false);
                    inFlightFetchRef.current = null;
                }
            })();

            inFlightFetchRef.current = p;
            return p;
        },
        [basePath, selectedDomain, updatedCompanyIds]
    );

    useEffect(() => {
        if (didInitRef.current) return;
        didInitRef.current = true;
        fetchCompanies();
    }, [fetchCompanies]);

    const handleEdit = (id: number) => {
        setEditId(id);
        const company = companies.find((c) => c.id === id);
        if (company) {
            setEditedCompany(company);
            setOriginalCompany(company);
            setEditedDomains(company.domains.map((d) => d.domain));
        }
    };

    const handleSave = useCallback(async () => {
        if (!editId) return;

        const payload: Partial<Company> = {
            id: editId,
            company_name: editedCompany.company_name,
            company_full: editedCompany.company_full,
            is_legacy: !!editedCompany.is_legacy,
            is_featured: !!editedCompany.is_featured,
        };

        const headers = { "x-access-permission": ACCESS_PERMISSION.MANAGE_COMPANY_LIST, "Content-Type": "application/json" };

        try {
            const [companyUpdateResponse, domainUpdateResponse] = await Promise.all([
                axios.put(`${basePath}/api/company`, payload, { headers }),
                axios.post(
                    `${basePath}/api/company/set-domain`,
                    { company_id: editId, domains: editedDomains },
                    { headers: { "x-access-permission": ACCESS_PERMISSION.MANAGE_COMPANY_LIST } }
                ),
            ]);

            if (!companyUpdateResponse.data.success || !domainUpdateResponse.data.success) {
                toast.error(`Failed to update company: ${companyUpdateResponse.data.error || domainUpdateResponse.data.error}`);
                return;
            }

            let newLogoUrl = originalCompany.logo_url;

            if (editedLogoFile) {
                const formData = new FormData();
                formData.append("logo", editedLogoFile);
                try {
                    const r = await axios.post(`${basePath}/api/company/upload-logo/${editId}`, formData, {
                        headers: { "x-access-permission": ACCESS_PERMISSION.MANAGE_COMPANY_LIST },
                    });

                    if (!r.data.success) {
                        toast.error(`Failed to upload logo: ${r.data.error}`);
                        return;
                    }

                    newLogoUrl = r?.data?.logo_url || newLogoUrl;
                } catch (err: any) {
                    toast.error(`Failed to upload logo: ${err.message}`);
                    return;
                }
            }

            const merged: Company = {
                ...(companies.find((c) => c.id === editId)!),
                company_name: editedCompany.company_name || "",
                company_full: editedCompany.company_full || "",
                is_legacy: !!editedCompany.is_legacy,
                is_featured: !!editedCompany.is_featured,
                domains: editedDomains.map((domain) => ({ domain })),
                logo_url: newLogoUrl,
                updated_at: new Date().toISOString(),
            };

            setCompanies((prev) => prev.map((c) => (c.id === editId ? merged : c)));
            setAllCompanies((prev) => prev.map((c) => (c.id === editId ? merged : c)));
            setUpdatedCompanyIds((prev) => new Set(prev).add(editId));

            toast.success(TOAST.saved);

            setEditId(null);
            setDomainMenuOpenId(null);
            setEditedLogoFile(null);
            setEditedDomains([]);

            previewUrlRef.current = null;

        } catch (err: any) {
            toast.error(`Failed to save changes: ${err.message}`);
        }
    }, [editId, editedCompany, editedDomains, companies, originalCompany.logo_url, editedLogoFile, basePath]);

    const handleDownloadExcel = async () => {
        try {
            setIsDownloading(true);

            const wb = new ExcelJS.Workbook();
            wb.creator = 'Vidyarth';
            wb.created = new Date();

            const ws = wb.addWorksheet('Companies', { views: [{ state: 'frozen', ySplit: 1 }] });

            ws.columns = [
                { header: 'ID', key: 'id' },
                { header: 'Company Name', key: 'company_name' },
                { header: 'Full Name', key: 'company_full' },
                { header: 'Legacy', key: 'is_legacy' },
                { header: 'Featured', key: 'is_featured' },
                { header: 'Logo URL', key: 'logo_url' },
            ];

            const header = ws.getRow(1);
            header.font = { bold: true };
            header.alignment = { vertical: 'middle', horizontal: 'center' };
            header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
            ws.autoFilter = { from: 'A1', to: 'F1' };

            allCompanies.forEach((c) => {
                const row = ws.addRow({
                    id: c.id,
                    company_name: c.company_name || '',
                    company_full: c.company_full || '',
                    is_legacy: c.is_legacy ? 'Yes' : 'No',
                    is_featured: c.is_featured ? 'Yes' : 'No',
                    logo_url: c.logo_url || '',
                });

                row.getCell('D').alignment = { horizontal: 'center' };
                row.getCell('E').alignment = { horizontal: 'center' };

                const url = c.logo_url || '';
                if (url) {
                    row.getCell('F').value = { text: 'Open', hyperlink: url, tooltip: url };
                    row.getCell('F').font = { color: { argb: 'FF0EA5E9' }, underline: true };
                }
            });

            ws.eachRow((row: any, rowNumber: number) => {
                if (rowNumber !== 1 && rowNumber % 2 === 0) {
                    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                }
            });

            const colLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
            const maxLen: number[] = [0, 0, 0, 0, 0, 0];
            ws.eachRow({ includeEmpty: true }, (row: any) => {
                row.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
                    const v = cell.value ?? '';
                    const s = typeof v === 'object' && v.text ? v.text : String(v);
                    maxLen[colNumber - 1] = Math.max(maxLen[colNumber - 1], s.length);
                });
            });
            colLetters.forEach((_, i) => {
                const pad = i <= 1 ? 2 : 4;
                ws.getColumn(i + 1).width = Math.min(60, Math.max(12, maxLen[i] + pad));
            });

            const buf = await wb.xlsx.writeBuffer();
            const blob = new Blob([buf], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `companies-${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            toast.success('Excel downloaded');
        } catch (e: any) {
            console.error(e);
            toast.error(e?.message || 'Failed to create Excel');
        } finally {
            setIsDownloading(false);
        }
    };


    const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const okType =
            [
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-excel",
            ].includes(file.type) || /\.xlsx?$/i.test(file.name);
        if (!okType) {
            toast.error("Please upload an .xlsx or .xls file.");
            e.currentTarget.value = "";
            return;
        }

        try {
            setIsUploading(true);
            const fd = new FormData();
            fd.append("file", file);

            const res = await axios.post(`${basePath}/api/company/all-upload`, fd, {
                headers: { "x-access-permission": ACCESS_PERMISSION.MANAGE_COMPANY_LIST },
            });

            if (!res?.data?.success) {
                toast.error(res?.data?.error || "Upload failed");
            } else {
                toast.success("List uploaded");
                setUpdatedCompanyIds(new Set<number>());
                await fetchCompanies(selectedDomain);
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.error || err?.message || "Upload failed");
        } finally {
            setIsUploading(false);
        }
    };


    const isDisabled = useMemo(() => {
        const sameBasics =
            originalCompany.company_name === editedCompany.company_name &&
            originalCompany.company_full === editedCompany.company_full &&
            !!originalCompany.is_legacy === !!editedCompany.is_legacy &&
            !!originalCompany.is_featured === !!editedCompany.is_featured &&
            originalCompany.logo_url === editedCompany.logo_url;

        const origDomains = (originalCompany.domains as any)?.map((d: any) => d.domain).sort() || [];
        const currDomains = [...editedDomains].sort();

        return sameBasics && JSON.stringify(origDomains) === JSON.stringify(currDomains);
    }, [originalCompany, editedCompany, editedDomains]);

    useEffect(() => {
        const base =
            selectedDomain === "ALL"
                ? allCompanies
                : allCompanies.filter((c) => c.domains.some((d) => d.domain === selectedDomain));
        setCompanies(base);
    }, [selectedDomain, allCompanies]);

    const baseCompanies = useMemo(() => {
        return selectedDomain === "ALL"
            ? allCompanies
            : allCompanies.filter((c) => c.domains.some((d) => d.domain === selectedDomain));
    }, [selectedDomain, allCompanies]);

    const handleSearch = useCallback(
        debounce((value: string) => {
            if (!value) {
                setCompanies(baseCompanies);
                return;
            }
            const lower = value.toLowerCase();
            const filtered = baseCompanies.filter(
                (c) =>
                    c.company_name.toLowerCase().includes(lower) ||
                    c.company_full.toLowerCase().includes(lower)
            );
            setCompanies(filtered);
        }, 200),
        [baseCompanies]
    );

    useEffect(() => {
        const handleShortcutCopyPaste = async (e: KeyboardEvent) => {
            const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
            if (!active || active.tagName === "INPUT" || active.tagName === "TEXTAREA") return;

            if (e.ctrlKey && e.shiftKey && e.code === "KeyC") {
                e.preventDefault();
                const selectedText = active.value?.substring(
                    (active as any).selectionStart || 0,
                    (active as any).selectionEnd || 0
                );
                if (selectedText) await navigator.clipboard.writeText(selectedText);
            }

            if (e.ctrlKey && e.shiftKey && e.code === "KeyV") {
                e.preventDefault();
                const pasteText = await navigator.clipboard.readText();
                const start = (active as any).selectionStart || 0;
                const end = (active as any).selectionEnd || 0;
                const before = (active as any).value?.substring(0, start) || "";
                const after = (active as any).value?.substring(end) || "";
                const newValue = before + pasteText + after;

                const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
                nativeSetter?.call(active, newValue);
                active.dispatchEvent(new Event("input", { bubbles: true }));
                (active as any).setSelectionRange(before.length + pasteText.length, before.length + pasteText.length);
            }

            if (e.key === "Escape") {
                (document.activeElement as HTMLElement | null)?.blur();
                setDomainMenuOpenId(null);
            }

            if (e.key === "Enter" && editId !== null) {
                e.preventDefault();
                handleSave();
            }
        };

        document.addEventListener("keydown", handleShortcutCopyPaste);
        return () => document.removeEventListener("keydown", handleShortcutCopyPaste);
    }, [editId, handleSave]);

    const handleDelete = async (id: number) => {
        try {
            const res = await axios.delete(`${basePath}/api/company?cid=${id}`, {
                headers: { "x-access-permission": ACCESS_PERMISSION.MANAGE_COMPANY_LIST },
            });
            if (!res?.data?.success) {
                toast.error(res?.data?.error || TOAST.deleteFail);
                return;
            }
            setCompanies((prev) => prev.filter((c) => c.id !== id));
            setAllCompanies((prev) => prev.filter((c) => c.id !== id));
            toast.success(TOAST.deleted);
        } catch {
            toast.error(TOAST.deleteFail);
        }
    };

    const handleInputChange = (field: keyof Company, value: string) => {
        setEditedCompany({ ...editedCompany, [field]: value });
    };

    const handleCheckboxChange = (field: "is_featured" | "is_legacy", value: boolean) => {
        setEditedCompany((prev) => ({ ...prev, [field]: value }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        const url = URL.createObjectURL(file);
        previewUrlRef.current = url;

        setEditedLogoFile(file);
        setEditedCompany(prev => ({ ...prev, logo_url: url }));
    };

    const toggleSort = (key: SortKey) => {
        if (key === sortKey) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortOrder("asc");
        }
    };

    const sortedCompanies = useMemo(() => {
        return [...companies].sort((a, b) => {
            const valA = (a[sortKey] as string)?.toLowerCase();
            const valB = (b[sortKey] as string)?.toLowerCase();
            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });
    }, [companies, sortKey, sortOrder]);

    return (
        <div className="px-3 sm:px-4 py-5 md:px-10 md:py-10 bg-gray-100 min-h-full">
            <div className="sticky top-0 bg-gray-100 pb-4 z-20">
                <div className="text-xs sm:text-sm text-gray-600 flex flex-wrap items-center gap-2 mb-2">
                    <span onClick={() => location.assign(`${basePath || ""}/`)} className="cursor-pointer hover:text-cyan-600">
                        Dashboard
                    </span>
                    <span>/</span>
                    <span className="text-gray-900 font-semibold">Manage Companies</span>
                </div>

                <motion.h1
                    layoutScroll
                    className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    Manage Companies
                </motion.h1>

                <div className="mt-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                    <div className="items-stretch flex flex-col md:flex-row md:items-center gap-2">
                        <select
                            value={selectedDomain}
                            onChange={(e) => setSelectedDomain(e.target.value)}
                            className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 w-full md:w-auto"
                        >
                            <option value="ALL">All Domains</option>
                            {ALL_DOMAINS.map((domain) => (
                                <option key={domain} value={domain}>
                                    {domain}
                                </option>
                            ))}
                        </select>

                        <motion.input
                            type="text"
                            placeholder="Search companies..."
                            onChange={(e) => handleSearch(e.target.value)}
                            whileFocus={{ scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300 }}
                            className="px-3 py-2 border border-gray-300 bg-white rounded-md text-sm text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 shadow-sm transition duration-75 w-full md:w-64"
                        />

                        <button
                            onClick={async () => { await fetchCompanies(selectedDomain); }}
                            className="p-2 rounded-md border border-gray-300 text-gray-600 hover:text-cyan-600 hover:border-cyan-500 transition shadow-sm self-start md:self-auto"
                            title="Refresh company list"
                        >
                            <motion.div
                                animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                                transition={{ repeat: isRefreshing ? Infinity : 0, repeatType: "loop", ease: "linear", duration: 1 }}
                            >
                                <ArrowPathIcon className="h-5 w-5" />
                            </motion.div>
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <button
                            onClick={handleDownloadExcel}
                            disabled={isDownloading}
                            className={`px-4 py-2 rounded-md text-sm font-medium shadow transition border border-gray-300 bg-white text-gray-700 hover:text-cyan-700 hover:border-cyan-500 ${isDownloading ? "opacity-60 cursor-not-allowed" : ""} w-full sm:w-auto`}
                        >
                            {isDownloading ? "Downloading…" : "Download List"}
                        </button>

                        <button
                            onClick={() => uploadExcelRef.current?.click()}
                            disabled={isUploading}
                            className={`px-4 py-2 rounded-md text-sm font-medium shadow transition border border-gray-300 bg-white text-gray-700 hover:text-cyan-700 hover:border-cyan-500 ${isUploading ? "opacity-60 cursor-not-allowed" : ""} w-full sm:w-auto`}
                        >
                            {isUploading ? "Uploading…" : "Upload List"}
                        </button>
                        <input
                            ref={uploadExcelRef}
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={handleUploadExcel}
                        />

                        <button
                            onClick={async () => {
                                try {
                                    const res = await axios.post(
                                        `${basePath}/api/company/create-default`,
                                        {},
                                        { headers: { "x-access-permission": ACCESS_PERMISSION.MANAGE_COMPANY_LIST } }
                                    );

                                    if (!res.data.success) {
                                        toast.error(TOAST.createFail);
                                        return;
                                    }

                                    const { data: company } = res.data;

                                    const created: Company = {
                                        id: company.id,
                                        company_name: company.company_name,
                                        company_full: company.company_full,
                                        logo_url: company.logo_url,
                                        is_legacy: !!company.is_legacy,
                                        is_featured: !!company.is_featured,
                                        firebase_path: company.firebase_path,
                                        domains: Array.isArray(company.domains) ? company.domains : [],
                                        updated_at: company.updated_at,
                                        created_at: company.created_at,
                                    };

                                    setAllCompanies((prev) => [created, ...prev]);
                                    setCompanies((prev) => [created, ...prev]);
                                    setUpdatedCompanyIds((prev) => new Set([...prev, created.id]));
                                    // reset filter
                                    // await fetchCompanies(selectedDomain);
                                    setEditId(created.id);
                                    setEditedCompany({
                                        company_name: created.company_name,
                                        company_full: created.company_full,
                                        is_legacy: created.is_legacy,
                                        is_featured: created.is_featured,
                                        logo_url: created.logo_url,
                                    });
                                    setEditedDomains(created.domains.map((d) => d.domain));
                                    setNewCompanyId(created.id);
                                    toast.success(TOAST.created);
                                } catch {
                                    toast.error(TOAST.createFail);
                                }
                            }}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow transition w-full md:w-auto"
                        >
                            + Add Company
                        </button>
                    </div>

                </div>

                {companies.length > 0 && (
                    <p className="text-xs sm:text-sm text-gray-600 mt-2 ml-1">
                        Showing {companies.length} item{companies.length > 1 ? "s" : ""}
                    </p>
                )}

                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="hidden md:grid mt-6 grid-cols-14 gap-4 font-semibold text-gray-700 text-sm uppercase tracking-wide"
                >
                    <div className="col-span-2">Logo</div>
                    <div className="col-span-3 flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("company_full")}>
                        Full Name {sortKey === "company_full" && (sortOrder === "asc" ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />)}
                    </div>
                    <div className="col-span-2 flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("company_name")}>
                        Name {sortKey === "company_name" && (sortOrder === "asc" ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />)}
                    </div>
                    <div className="col-span-3">Domains</div>
                    <div className="col-span-1">Legacy</div>
                    <div className="col-span-1">Featured</div>
                    <div className="col-span-2">Actions</div>
                </motion.div>
            </div>

            {companies.length === 0 ? (
                <div className="text-gray-500 text-center mt-10 text-base">No companies available.</div>
            ) : (
                <AnimatePresence>
                    {sortedCompanies.map((company) => {
                        const isEditing = editId === company.id;
                        return (
                            <motion.div
                                key={company.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.35, ease: "easeOut" }}
                                className={`mt-4 grid grid-cols-1 md:grid-cols-14 gap-3 md:gap-4 md:items-center md:py-3 bg-white shadow-sm rounded-lg px-4 py-4 ${company.id === newCompanyId ? "animate-highlight" : ""}`}
                            >
                                <div className="col-span-2">
                                    <div className="md:hidden text-[11px] uppercase tracking-wide text-gray-500 mb-1">Logo</div>
                                    <div className="flex items-center gap-3">
                                        {isEditing && previewUrlRef.current ? (
                                            <Image
                                                src={previewUrlRef.current}
                                                alt="Logo"
                                                width={40}
                                                height={40}
                                                className="object-contain rounded"
                                                unoptimized={previewUrlRef.current?.startsWith('blob:')}
                                            />
                                        ) : company.logo_url ? (
                                            <Image
                                                src={company.logo_url}
                                                alt="Logo"
                                                width={40}
                                                height={40}
                                                className="object-contain rounded"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-gray-200 rounded" />
                                        )}

                                        {isEditing && (
                                            <>
                                                <label htmlFor={`logo-${company.id}`} className="text-xs text-cyan-600 cursor-pointer flex items-center gap-1">
                                                    <ArrowUpTrayIcon className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Upload</span>
                                                </label>
                                                <input id={`logo-${company.id}`} type="file"
                                                    accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e)} />
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="col-span-3">
                                    <div className="md:hidden text-[11px] uppercase tracking-wide text-gray-500 mb-1">Full Name</div>
                                    {isEditing ? (
                                        <input
                                            ref={isEditing && company.id === newCompanyId ? inputRef : null}
                                            value={isEditing ? editedCompany.company_full ?? "" : company.company_full}
                                            onChange={(e) => handleInputChange("company_full", e.target.value)}
                                            className="w-full px-3 py-2 border rounded bg-white text-sm text-gray-900"
                                        />
                                    ) : (
                                        <div className="text-gray-800 break-words">{company.company_full}</div>
                                    )}
                                </div>

                                <div className="col-span-2">
                                    <div className="md:hidden text-[11px] uppercase tracking-wide text-gray-500 mb-1">Name</div>
                                    {isEditing ? (
                                        <input
                                            value={isEditing ? editedCompany.company_name ?? "" : company.company_name}
                                            onChange={(e) => handleInputChange("company_name", e.target.value)}
                                            className="w-full px-3 py-2 border rounded bg-white text-sm text-gray-900"
                                        />
                                    ) : (
                                        <div className="text-gray-800 break-words">{company.company_name}</div>
                                    )}
                                </div>

                                <div className="col-span-3 flex flex-wrap gap-1 relative group">
                                    <div className="md:hidden w-full text-[11px] uppercase tracking-wide text-gray-500 mb-1">Domains</div>
                                    {(isEditing ? editedDomains : company.domains.map((d) => d.domain)).map((domain, i) => {
                                        const color = DOMAIN_COLORS[domain] || { bg: "bg-gray-100", text: "text-gray-800", border: "" };
                                        return (
                                            <motion.div key={i} whileHover={{ scale: 1.05 }} className={`inline-flex items-center gap-1 ${color.bg} ${color.text} ${color.border} text-xs px-2 py-0.5 rounded transition duration-200`}>
                                                <span>{domain}</span>
                                                {isEditing && (
                                                    <button onClick={() => setEditedDomains((prev) => prev.filter((d) => d !== domain))} className="hover:text-red-600">
                                                        <XMarkIcon className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </motion.div>
                                        );
                                    })}

                                    {isEditing && (
                                        <motion.button whileHover={{ scale: 1.1 }} className="ml-1 p-1 rounded hover:bg-gray-200 transition" onClick={() => setDomainMenuOpenId(company.id)}>
                                            <PlusIcon className="w-4 h-4 text-gray-600 hover:text-cyan-600" />
                                        </motion.button>
                                    )}

                                    {domainMenuOpenId === company.id && (
                                        <div className="absolute top-7 left-0 right-auto md:right-auto z-10 bg-white shadow-md rounded border p-2 space-y-1 max-h-40 overflow-auto">
                                            {ALL_DOMAINS.filter((d) => !editedDomains.includes(d)).map((domain) => (
                                                <div
                                                    key={domain}
                                                    onClick={() => {
                                                        setEditedDomains((prev) => [...prev, domain]);
                                                        setDomainMenuOpenId(null);
                                                    }}
                                                    className="cursor-pointer text-sm text-gray-700 hover:text-cyan-700"
                                                >
                                                    {domain}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="col-span-1 flex items-center md:justify-center">
                                    <div className="md:hidden text-[11px] uppercase tracking-wide text-gray-500 mr-2">Legacy</div>
                                    {isEditing ? (
                                        <button onClick={() => handleCheckboxChange("is_legacy", !editedCompany.is_legacy)}>
                                            {editedCompany.is_legacy ? <CheckCircleIcon className="w-5 h-5 text-yellow-500" /> : <XCircleIcon className="w-5 h-5 text-gray-400" />}
                                        </button>
                                    ) : company.is_legacy ? (
                                        <CheckCircleIcon className="w-5 h-5 text-yellow-500" />
                                    ) : (
                                        <XCircleIcon className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>

                                <div className="col-span-1 flex items-center md:justify-center">
                                    <div className="md:hidden text-[11px] uppercase tracking-wide text-gray-500 mr-2">Featured</div>
                                    {isEditing ? (
                                        <button onClick={() => handleCheckboxChange("is_featured", !editedCompany.is_featured)}>
                                            {editedCompany.is_featured ? <CheckCircleIcon className="w-5 h-5 text-green-500" /> : <XCircleIcon className="w-5 h-5 text-gray-400" />}
                                        </button>
                                    ) : company.is_featured ? (
                                        <CheckCircleIcon className="w-5 h-5 text-yellow-500" />
                                    ) : (
                                        <XCircleIcon className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>

                                <div className="col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-sm">
                                    <div className="md:hidden text-[11px] uppercase tracking-wide text-gray-500">Actions</div>
                                    {isEditing ? (
                                        <>
                                            <button
                                                disabled={isDisabled}
                                                onClick={handleSave}
                                                className={`flex items-center justify-center gap-1 px-3 py-2 rounded-md text-sm shadow transition ${isDisabled ? "bg-gray-400 text-white cursor-not-allowed" : "bg-green-600 hover:bg-green-700 text-white"}`}
                                            >
                                                <CheckIcon className="w-4 h-4" /> Save
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setEditId(null);
                                                    setDomainMenuOpenId(null);
                                                    setEditedDomains([]);
                                                    setEditedCompany({});
                                                    previewUrlRef.current = null;
                                                }}
                                                className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-600 text-white rounded-md text-sm shadow hover:bg-gray-700 transition"
                                            >
                                                <XMarkIcon className="w-4 h-4" /> Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleEdit(company.id)}
                                                className="flex items-center justify-center gap-1 px-3 py-2 bg-cyan-600 text-white rounded-md text-sm shadow hover:bg-cyan-700 transition"
                                            >
                                                <PencilIcon className="w-4 h-4" /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(company.id)}
                                                className="flex items-center justify-center gap-1 px-3 py-2 bg-red-500 text-white rounded-md text-sm shadow hover:bg-red-600 transition"
                                            >
                                                <TrashIcon className="w-4 h-4" /> Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            )}
        </div>
    );
}
