// components/ManageCompaniesList.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import Image from "next/image";
import axios from "axios";
import toast from "react-hot-toast";
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
    deleted: "Company deleted",
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

    // Avoid double initial fetch in React 18 Strict Mode
    const didInitRef = useRef(false);

    // Deduplicate concurrent fetches
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

    // Ensure featured is true if legacy toggled on (without mutating during render)
    useEffect(() => {
        if (editId && editedCompany.is_legacy && !editedCompany.is_featured) {
            setEditedCompany((prev) => ({ ...prev, is_featured: true }));
        }
    }, [editId, editedCompany.is_legacy, editedCompany.is_featured]);

    const extractCompanies = (res: any): Company[] => {
        const data = Array.isArray(res) ? res : res?.data;
        const list = Array.isArray(data) ? data : data?.companies;
        const items = Array.isArray(list) ? list : [];
        return items.filter((c: Company) => c?.id > 0);
    };

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
                        fetchedCompanies = extractCompanies(res);
                    } else {
                        const res = await fetchCompanyListWithPermission(ACCESS_PERMISSION.MANAGE_COMPANY_LIST);
                        fetchedCompanies = extractCompanies(res);
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
                } catch {
                    toast.error(TOAST.loadFail);
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
            // Save main fields + domains in parallel
            await Promise.all([
                axios.put(`${basePath}/api/company`, payload, { headers }),
                axios.post(
                    `${basePath}/api/company/set-domain`,
                    { company_id: editId, domains: editedDomains },
                    { headers: { "x-access-permission": ACCESS_PERMISSION.MANAGE_COMPANY_LIST } }
                ),
            ]);

            let newLogoUrl = originalCompany.logo_url;

            if (editedLogoFile) {
                const formData = new FormData();
                formData.append("logo", editedLogoFile);
                try {
                    const r = await axios.post(`${basePath}/api/company/upload-logo/${editId}`, formData, {
                        headers: { "x-access-permission": ACCESS_PERMISSION.MANAGE_COMPANY_LIST },
                    });
                    newLogoUrl = r?.data?.logo_url || newLogoUrl;
                } catch {
                    toast.error(TOAST.logoFail);
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

            // Local optimistic update (no refetch)
            setCompanies((prev) => prev.map((c) => (c.id === editId ? merged : c)));
            setAllCompanies((prev) => prev.map((c) => (c.id === editId ? merged : c)));
            setUpdatedCompanyIds((prev) => new Set(prev).add(editId));

            toast.success(TOAST.saved);

            setEditId(null);
            setDomainMenuOpenId(null);
            setEditedLogoFile(null);
            setEditedDomains([]);
        } catch {
            toast.error(TOAST.saveFail);
        }
    }, [editId, editedCompany, editedDomains, companies, originalCompany.logo_url, editedLogoFile, basePath]);

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

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, id: number) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setEditedLogoFile(file);
        setEditedCompany((prev) => ({ ...prev, logo_url: URL.createObjectURL(file) }));
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
            const valA = a[sortKey]?.toLowerCase();
            const valB = b[sortKey]?.toLowerCase();
            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });
    }, [companies, sortKey, sortOrder]);

    const logoSrc = (logo?: string, updatedAt?: string) => {
        if (!logo) return "";
        const withBase = logo.startsWith("/") ? `${basePath}${logo}` : `${basePath}/${logo}`;
        const v = updatedAt ? `?v=${encodeURIComponent(updatedAt)}` : "";
        return `${withBase}${v}`;
    };

    return (
        <div className="px-4 py-6 md:px-10 md:py-10 bg-gray-100 min-h-screen">
            <div className="sticky top-0 bg-gray-100 pb-4 z-20">
                <div className="text-sm text-gray-600 flex gap-2 mb-2">
                    <span onClick={() => location.assign(`${basePath || ""}/`)} className="cursor-pointer hover:text-cyan-600">
                        Dashboard
                    </span>
                    <span>/</span>
                    <span className="text-gray-900 font-semibold">Manage Companies</span>
                </div>

                <motion.h1
                    layoutScroll
                    className="text-2xl md:text-3xl font-bold text-gray-900"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    Manage Companies
                </motion.h1>

                <div className="mt-4 flex justify-between items-center">
                    <div className="items-center flex flex-col md:flex-row md:items-center gap-2 mt-4">
                        <select
                            value={selectedDomain}
                            onChange={(e) => setSelectedDomain(e.target.value)}
                            className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
                            whileFocus={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 300 }}
                            className="px-4 py-2 border border-gray-300 bg-white rounded-md text-sm text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 shadow-sm focus:shadow-lg transition duration-75 w-64"
                        />

                        <button
                            onClick={async () => {
                                await fetchCompanies(selectedDomain);
                            }}
                            className="p-2 rounded-md border border-gray-300 text-gray-600 hover:text-cyan-600 hover:border-cyan-500 transition shadow-sm hover:shadow-md"
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

                    <button
                        onClick={async () => {
                            try {
                                const res = await axios.post(
                                    `${basePath}/api/company/create-default`,
                                    {},
                                    { headers: { "x-access-permission": ACCESS_PERMISSION.MANAGE_COMPANY_LIST } }
                                );
                                const created: Company =
                                    res?.data && res.data.id
                                        ? {
                                            id: res.data.id,
                                            company_name: res.data.company_name || "",
                                            company_full: res.data.company_full || "",
                                            logo_url: res.data.logo_url || "",
                                            is_legacy: !!res.data.is_legacy,
                                            is_featured: !!res.data.is_featured,
                                            domains: Array.isArray(res.data.domains) ? res.data.domains : [],
                                            updated_at: res.data.updated_at,
                                            created_at: res.data.created_at,
                                        }
                                        : {
                                            id: Date.now(), // fallback
                                            company_name: "New Company",
                                            company_full: "New Company",
                                            logo_url: "",
                                            is_legacy: false,
                                            is_featured: false,
                                            domains: [],
                                        };

                                setAllCompanies((prev) => [created, ...prev]);
                                setCompanies((prev) => [created, ...prev]);
                                setEditId(created.id);
                                setEditedCompany({
                                    company_name: created.company_name,
                                    company_full: created.company_full,
                                    is_legacy: created.is_legacy,
                                    is_featured: created.is_featured,
                                });
                                setEditedDomains(created.domains.map((d) => d.domain));
                                setNewCompanyId(created.id);
                                toast.success(TOAST.created);
                            } catch {
                                toast.error(TOAST.createFail);
                            }
                        }}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow transition"
                    >
                        + Add Company
                    </button>
                </div>

                {companies.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2 ml-1">
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
                                className={`mt-4 grid grid-cols-1 md:grid-cols-14 gap-4 md:items-center md:py-3 bg-white shadow-sm rounded-lg px-4 py-3 ${company.id === newCompanyId ? "animate-highlight" : ""
                                    }`}
                            >
                                <div className="col-span-2">
                                    <div className="flex items-center gap-2">
                                        {company.logo_url ? (
                                            <Image
                                                src={logoSrc(company.logo_url, company.updated_at)}
                                                alt="Logo"
                                                width={40}
                                                height={40}
                                                className="rounded"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-gray-200 rounded" />
                                        )}

                                        {isEditing && (
                                            <>
                                                <label htmlFor={`logo-${company.id}`} className="text-xs text-cyan-600 cursor-pointer">
                                                    <ArrowUpTrayIcon className="w-4 h-4" />
                                                </label>
                                                <input id={`logo-${company.id}`} type="file" className="hidden" onChange={(e) => handleLogoUpload(e, company.id)} />
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="col-span-3">
                                    {isEditing ? (
                                        <input
                                            ref={isEditing && company.id === newCompanyId ? inputRef : null}
                                            value={isEditing ? editedCompany.company_full ?? "" : company.company_full}
                                            onChange={(e) => handleInputChange("company_full", e.target.value)}
                                            className="w-full px-2 py-1 border rounded bg-white text-sm text-gray-900"
                                        />
                                    ) : (
                                        <div className="text-gray-800">{company.company_full}</div>
                                    )}
                                </div>

                                <div className="col-span-2">
                                    {isEditing ? (
                                        <input
                                            value={isEditing ? editedCompany.company_name ?? "" : company.company_name}
                                            onChange={(e) => handleInputChange("company_name", e.target.value)}
                                            className="w-full px-2 py-1 border rounded bg-white text-sm text-gray-900"
                                        />
                                    ) : (
                                        <div className="text-gray-800">{company.company_name}</div>
                                    )}
                                </div>

                                <div className="col-span-3 flex flex-wrap gap-1 relative group">
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
                                        <motion.button whileHover={{ scale: 1.2 }} className="ml-1 p-1 rounded hover:bg-gray-200 transition" onClick={() => setDomainMenuOpenId(company.id)}>
                                            <PlusIcon className="w-4 h-4 text-gray-600 hover:text-cyan-600" />
                                        </motion.button>
                                    )}

                                    {domainMenuOpenId === company.id && (
                                        <div className="absolute top-6 left-0 z-10 bg-white shadow-md rounded border p-2 space-y-1">
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

                                <div className="col-span-1 flex justify-center">
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

                                <div className="col-span-1 flex justify-center">
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

                                <div className="col-span-2 flex items-center gap-3 text-sm">
                                    {isEditing ? (
                                        <>
                                            <button
                                                disabled={isDisabled}
                                                onClick={handleSave}
                                                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm shadow transition ${isDisabled ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 text-white"
                                                    }`}
                                            >
                                                <CheckIcon className="w-4 h-4" /> Save
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setEditId(null);
                                                    setDomainMenuOpenId(null);
                                                    setEditedDomains([]);
                                                    setEditedCompany({});
                                                }}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded-md text-sm shadow hover:bg-gray-700 transition"
                                            >
                                                <XMarkIcon className="w-4 h-4" /> Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleEdit(company.id)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 text-white rounded-md text-sm shadow hover:bg-cyan-700 transition"
                                            >
                                                <PencilIcon className="w-4 h-4" /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(company.id)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-md text-sm shadow hover:bg-red-600 transition"
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
