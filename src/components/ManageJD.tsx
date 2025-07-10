// components/ManageJDList.tsx
import { useState, useEffect, JSX } from "react";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { DocumentIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/solid";
import { ALL_DOMAINS, DOMAIN_COLORS } from "./ManageCompanyList";
import { useRouter } from "next/router";
import axios from "axios";
import { ArrowDownTrayIcon, ArrowPathIcon, ChevronDownIcon, ChevronUpIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import PortalWrapper from "./PortableWrapper";
import CompanySearchDropdown, { Company } from "./CompanySearchDropDown";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ACCESS_PERMISSION, PLACEMENT_CYCLE_STATUS, PLACEMENT_CYCLE_TYPE } from "@prisma/client";
import { PlacementCycle } from "./ManagePlacementCycle";
import ConfirmRowOverlay from "./ConfirmOverlay";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";


interface JDEntry {
    id: string;
    role: string;
    pdf_path: string;
    pdf_name: string;
    active: boolean;
    company_id: number,
    company_full: string,
    company_logo: string,
    company_name: string,
    company_domains: string[],
    placement_cycle_id: number,
    placement_cycle_type: string,

    domains: {
        id: number;
        domain: string;
    }[];
}

type SortKey = "company_full" | "role" | "placement_cycle_type" | "active";

export default function ManageJDList() {
    const [jdList, setJDList] = useState<JDEntry[]>([]);
    const [editJDId, setEditJDId] = useState<string | null>(null);
    const [editedJD, setEditedJD] = useState<Partial<JDEntry> & { pdf_file_name?: string; pdf_file?: File; isNewPDFUploaded?: boolean }>({ isNewPDFUploaded: false });

    const [selectedCompany, setSelectedCompany] = useState("");
    const [selectedRole, setSelectedRole] = useState("");
    const [selectedDomain, setSelectedDomain] = useState("");
    const [selectedCycle, setSelectedCycle] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [domainMenuOpenId, setDomainMenuOpenId] = useState<string | null>(null);

    const [showCompanyOverlay, setShowCompanyOverlay] = useState(false);
    const [showJDOverlay, setShowJDOverlay] = useState(false);

    const [isRefreshing, setIsRefreshing] = useState(false);

    const [editCompany, setEditCompany] = useState<Company>();

    const [sortKey, setSortKey] = useState<SortKey>("company_full");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [availableDomains, setAvailableDomains] = useState<string[]>([]);
    const [showDeleteFor, setShowDeleteFor] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const [showLoadingScreen, setShowLoadingScreen] = useState<Boolean>(false);

    const [placementCycles, setPlacementCycles] = useState<{
        id: number;
        label: string,
        type: PLACEMENT_CYCLE_TYPE,
        status: PLACEMENT_CYCLE_STATUS
    }[]>([]);

    const router = useRouter();

    const fetchJDs = async () => {
        setIsRefreshing(true);
        try {
            const res = await axios.get("/api/jd", {
                headers: {
                    "Content-Type": "application/json",
                    "x-access-permission": ACCESS_PERMISSION.MANAGE_COMPANY_JD
                }
            });

            const transformed = res.data.allJDs.map((jd: any): JDEntry => ({
                id: jd.id,
                role: jd.role,
                pdf_path: jd.pdf_path,
                pdf_name: jd.pdf_name,
                active: jd.is_active,

                company_id: jd.company.id,
                company_full: jd.company.company_full,
                company_logo: jd.company.logo_url || "",
                company_name: jd.company.company_name,
                company_domains: (jd.company.domains || []).map((d: any) => d.domain),

                placement_cycle_id: jd.placement_cycle.id,
                placement_cycle_type: jd.placement_cycle.placement_type,

                domains: jd.domains,
            }));

            setJDList(transformed);
        } catch {
            toast.error("Failed to load JDs");
        } finally {
            setTimeout(() => {
                setIsRefreshing(false);
            }, 1000)
        }
    };

    const fetchCycles = async () => {
        setIsRefreshing(true);
        try {
            const res = await axios.get("/api/placement-cycles", {
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.MANAGE_COMPANY_JD
                }
            });
            const data = res.data;
            setPlacementCycles(data.map((value: PlacementCycle): {
                id: number;
                label: string,
                status: PLACEMENT_CYCLE_STATUS,
                type: PLACEMENT_CYCLE_TYPE
            } => {
                return {
                    id: value.id,
                    label: `${value.placement_type.charAt(0).toUpperCase() + value.placement_type.slice(1).toLowerCase()} ${value.year}`,
                    status: value.status,
                    type: value.placement_type
                }
            }));
        } catch (err) {
            toast.error("Failed to load placement cycles");
        } finally {
            setTimeout(() => {
                setIsRefreshing(false)
            }, 1000);
        }
    };


    useEffect(() => {
        fetchJDs();
        fetchCycles();
    }, []);


    const handleEdit = (id: string, jd: any) => {
        setEditJDId(id);
        setEditedJD({
            ...jd,
            pdf_path: jd.pdf_path ?? "",
            pdf_file: null,
            pdf_file_name: jd.pdf_name || jd.pdf_path?.split("/").pop() || "",
            isNewPDFUploaded: false
        });
    };

    const handleDelete = async (id: string) => {
        try {
            const match = jdList.find(jd => jd.id === id);
            const companyName = match?.company_full || "";
            const role = match?.role || "";

            let name = "";

            if (companyName.trim() == "" || role.trim() == "") {
                name = "JD"
            } else {
                name = `${companyName}(${role})`
            }

            await axios.delete("/api/jd", {
                params: { id }, headers: {
                    "x-access-permission": ACCESS_PERMISSION.MANAGE_COMPANY_JD
                }
            });

            toast.success(`${name} deleted`);
            fetchJDs();
            setShowDeleteFor(null);
        } catch {
            toast.error("Failed to delete JD");
        }
    };

    const exportToExcel = async () => {
        setIsDownloading(true);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("JDs");

        // Define columns
        sheet.columns = [
            { header: "Company", key: "company", width: 25 },
            { header: "Role", key: "role", width: 25 },
            { header: "Domains", key: "domains", width: 30 },
            { header: "Cycle", key: "cycle", width: 20 },
            { header: "Status", key: "status", width: 12 },
            { header: "JD File", key: "jdFile", width: 40 },
        ];

        // Add JD rows
        jdList.forEach((jd) => {
            sheet.addRow({
                company: jd.company_full || "N/A",
                role: jd.role,
                domains: (jd.domains || []).map((d: any) => typeof d === "string" ? d : d.domain).join(", "),
                cycle: placementCycles.find(pc => pc.id === jd.placement_cycle_id)
                    ? `${placementCycles.find(pc => pc.id === jd.placement_cycle_id)?.type} ${placementCycles.find(pc => pc.id === jd.placement_cycle_id)?.label?.split(" ").pop()}`
                    : "N/A",
                status: placementCycles.find(pc => pc.id === jd.placement_cycle_id)?.status === "OPEN" ? "Active" : "Inactive",
                jdFile: jd.pdf_path || "No JD Uploaded",
            });
        });

        // Style header row
        sheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            cell.alignment = { vertical: "middle", horizontal: "center" };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF1E293B" }, // Slate-800
            };
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
        });

        // Center align body rows
        sheet.eachRow((row, rowIndex) => {
            if (rowIndex !== 1) {
                row.eachCell((cell) => {
                    cell.alignment = { vertical: "middle", horizontal: "center" };
                });
            }
        });

        // Save
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), "JD_List.xlsx");

        setTimeout(() => setIsDownloading(false), 1000);
    };



    const handleSave = async () => {
        const ENABLE_PUT_CALL = true;
        setShowLoadingScreen(true);

        if (!editJDId) return;
        const originalJD = jdList.find((jd) => jd.id === editJDId);
        if (!originalJD) return;

        const role = editedJD.role || originalJD.role || "";
        const is_active = String(editedJD.active ?? true);
        const company_id = String(editCompany?.id || originalJD.company_id || "");
        const placement_cycle_id = String(editedJD.placement_cycle_id);
        const domainList = (editedJD.domains || []).map((d) => d.domain);

        const formData = new FormData();
        formData.append("is_default", "false");
        formData.append("id", editJDId);
        formData.append("role", role);
        formData.append("is_active", is_active);
        formData.append("company_id", company_id);
        formData.append("placement_cycle_id", placement_cycle_id);
        formData.append("domains", JSON.stringify(domainList));
        formData.append("keep_existing_pdf", editedJD.isNewPDFUploaded ? "false" : "true")

        const pdf_file = editedJD.pdf_file;
        const pdf_path = editedJD.pdf_path || originalJD.pdf_path;
        const pdf_name = editedJD.pdf_name;

        if (pdf_file instanceof File && pdf_name) {
            formData.append("pdf", pdf_file);
            formData.append("pdf_name", pdf_name)
        } else if (pdf_path) {
            formData.append("pdf_path", pdf_path);
        }

        console.log("JD Save Debug Info:");
        console.log("JD ID:", editJDId);
        console.log("Role:", role);
        console.log("Active:", is_active);
        console.log("Company ID:", company_id);
        console.log("Placement Cycle ID:", placement_cycle_id);
        console.log("Domains:", domainList);
        console.log("PDF Path:", pdf_path);
        console.log("PDF File:", pdf_file?.name || "None");
        console.log("PUT Enabled:", ENABLE_PUT_CALL);
        console.log("Keep Existing PDF", editedJD.isNewPDFUploaded)

        if (!ENABLE_PUT_CALL) {
            toast("PUT call skipped (debug mode)");
            setEditJDId(null);
            setEditedJD({ isNewPDFUploaded: false });
            setEditCompany(undefined);
            setShowJDOverlay(false);
            setShowCompanyOverlay(false);
            setDomainMenuOpenId(null);

            return;
        }

        try {
            const res = await axios.put("/api/jd/", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    "x-access-permission": ACCESS_PERMISSION.MANAGE_COMPANY_JD
                },
            });
            setShowLoadingScreen(false);
            toast.success("JD updated");

            setEditJDId(null);
            setEditedJD({ isNewPDFUploaded: false });
            setEditCompany(undefined);
            setShowJDOverlay(false);
            setShowCompanyOverlay(false);
            setDomainMenuOpenId(null);

            fetchJDs();
        } catch (err) {
            toast.error("Failed to update JD");
        } finally {
            setShowLoadingScreen(false)
        }
    };

    useEffect(() => {
        return () => {
            if (editedJD.pdf_path?.startsWith("blob:")) {
                URL.revokeObjectURL(editedJD.pdf_path);
            }
        };
    }, []);

    const handleCancelEdit = () => {
        setEditJDId(null);
        setEditCompany(undefined);
        setShowJDOverlay(false);
        setShowCompanyOverlay(false);
        setDomainMenuOpenId(null);
    };

    const getFilteredJDs = () => {
        const filtered = jdList.filter((jd) => {
            const matchesCompany = selectedCompany === "" || jd.company_full.toLowerCase().includes(selectedCompany.toLowerCase()) || jd.company_name.toLowerCase().includes(selectedCompany.toLowerCase());
            const matchesRole = selectedRole === "" || jd.role.toLowerCase().includes(selectedRole.toLowerCase());
            const matchesDomain = selectedDomain === "" || jd.domains.some(d => d.domain === selectedDomain);
            const matchesCycle = selectedCycle === "" || jd.placement_cycle_type === selectedCycle;
            const matchesStatus =
                selectedStatus === "" ||
                (selectedStatus === "active" && jd.active) ||
                (selectedStatus === "inactive" && !jd.active);

            return matchesCompany && matchesRole && matchesDomain && matchesCycle && matchesStatus;
        });

        return filtered.sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];

            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });
    };


    useEffect(() => {
        const handleShortcutCopyPaste = async (e: KeyboardEvent) => {
            const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;

            if (!active || (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;

            if (e.ctrlKey && e.shiftKey && e.code === "KeyC") {
                e.preventDefault();
                const selectedText = active.value.substring(active.selectionStart || 0, active.selectionEnd || 0);
                await navigator.clipboard.writeText(selectedText);
            }

            if (e.ctrlKey && e.shiftKey && e.code === "KeyV") {
                e.preventDefault();
                const pasteText = await navigator.clipboard.readText();
                const start = active.selectionStart || 0;
                const end = active.selectionEnd || 0;
                const before = active.value.substring(0, start);
                const after = active.value.substring(end);
                const newValue = before + pasteText + after;

                const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
                nativeSetter?.call(active, newValue);
                active.dispatchEvent(new Event("input", { bubbles: true }));
                active.setSelectionRange(before.length + pasteText.length, before.length + pasteText.length);
            }

            if (e.key === "Escape") {
                setDomainMenuOpenId(null);
                setShowJDOverlay(false);
                setShowCompanyOverlay(false);
                document.activeElement instanceof HTMLElement && document.activeElement.blur();
            }

            if (e.key === "Enter" && editJDId !== null) {
                e.preventDefault();
                // if(showOverlay) return;
                // handleSave();
            }
        };

        document.addEventListener("keydown", handleShortcutCopyPaste);
        return () => document.removeEventListener("keydown", handleShortcutCopyPaste);
    }, [editJDId, handleSave, domainMenuOpenId]);


    const ActionButton = ({ icon, label, onClick, color }: { icon: JSX.Element; label: string; onClick: () => void; color: string }) => (
        <button
            onClick={onClick}
            className={`flex items-center gap-1 px-3 py-1 ${color} text-white rounded-md text-sm shadow hover:opacity-90 transition`}
        >
            {icon} {label}
        </button>
    );

    function highlightMatch(text: string, query: string) {
        if (!query) return text;

        const regex = new RegExp(`(${query})`, "ig");
        const parts = text.split(regex);

        return parts.map((part, index) =>
            regex.test(part) ? (
                <span key={index} className="bg-yellow-200 text-black font-semibold">
                    {part}
                </span>
            ) : (
                part
            )
        );
    }

    const toggleSort = (key: SortKey) => {
        if (key === sortKey) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortOrder("asc");
        }
    };

    const getDomainsForCompany = async (companyId: number): Promise<string[]> => {
        const matchingJDs = jdList.filter(jd => jd.company_id === companyId);
        const uniqueDomains = new Set<string>();
        matchingJDs.forEach(jd => {
            jd.company_domains.forEach(d => uniqueDomains.add(d));
        });

        if (uniqueDomains.size > 0) {
            return Array.from(uniqueDomains);
        }

        try {
            const res = await axios.get(`/api/company/get-domain/${companyId}`, {
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.MANAGE_COMPANY_JD
                }
            });
            const fetchedDomains: string[] = res.data.domains || [];

            return fetchedDomains;
        } catch (error) {
            toast.error("Failed to load domains");
            return [];
        }
    };


    let filteredJD = getFilteredJDs();

    return (
        <div className="p-6 md:p-8 bg-gray-100 h-full -z-10">
            <div className="sticky top-0 pb-4 z-20">
                <div className="text-sm text-gray-600 flex gap-2 mb-2">
                    <span onClick={() => router.push("/")} className="cursor-pointer hover:text-cyan-600">Dashboard</span>
                    <span>/</span>
                    <span className="text-gray-900 font-semibold">Manage Job Descriptions</span>
                </div>
            </div>

            <motion.h1
                layoutScroll
                className="text-2xl md:text-3xl font-bold text-gray-900"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            > Manage Job Descriptions
            </motion.h1>

            <div className="mt-4 flex justify-between items-center">
                <div className="flex items-center gap-2">

                    {/* Filter: DOMAIN*/}
                    <select
                        value={selectedDomain}
                        onChange={(e) => setSelectedDomain(e.target.value)}
                        className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                        <option value="">All Domains</option>
                        {Object.values(ALL_DOMAINS).map((domain, _i) => (
                            <option key={domain}>{domain}</option>
                        ))}
                    </select>

                    {/* DOMAIN: Cycle */}
                    <select
                        value={selectedCycle}
                        onChange={(e) => setSelectedCycle(e.target.value)}
                        className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                        <option value="">All Cycles</option>
                        {placementCycles.map((cycle) => (
                            <option key={cycle.id} value={cycle.label}>{cycle.label}</option>
                        ))}
                    </select>

                    {/* DOMAIN: Company Name */}
                    <motion.input
                        type="text"
                        placeholder="Company"
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        whileFocus={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm text-black bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 shadow-sm focus:shadow-lg transition duration-75 w-64"
                    />

                    {/* DOMAIN: Role */}
                    <motion.input
                        type="text"
                        placeholder="Role"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        whileFocus={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 focus:shadow-lg transition duration-75"
                    />

                    {/* DOMAIN: Stautus */}
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>

                    <button
                        onClick={async (e) => {
                            await fetchJDs();
                        }}
                        className="p-2 rounded-md border border-gray-300 text-gray-600 hover:text-cyan-600 hover:border-cyan-500 transition shadow-sm hover:shadow-md"
                        title="Refresh JD List"
                    >

                        <motion.div
                            animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                            transition={{
                                repeat: isRefreshing ? Infinity : 0,
                                repeatType: "loop",
                                ease: "linear",
                                duration: 1,
                            }}
                        >
                            <ArrowPathIcon className="h-5 w-5" />
                        </motion.div>

                    </button>

                </div>

                <div className="flex items-center gap-2 ml-auto">
                    <button
                        onClick={exportToExcel}
                        className="ml-2 px-3 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 
                        text-white text-sm font-medium shadow-sm transition flex flex-row items-center"
                    >
                        <motion.div
                            animate={isDownloading ? { y: [0, 6, -4, 0] } : { y: 0 }}
                            transition={{
                                duration: 0.6,
                                repeat: isDownloading ? Infinity : 0,
                                repeatDelay: 0.5,
                                ease: "easeInOut",
                            }}
                        >
                            <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                        </motion.div>
                        Export to Excel
                    </button>

                    <button
                        onClick={async () => {
                            try {
                                const res = await axios.post("/api/jd", {
                                    is_default: true
                                }, {
                                    headers: {
                                        "Content-Type": "application/json",
                                        "x-access-permission": ACCESS_PERMISSION.MANAGE_COMPANY_JD
                                    }
                                });
                                toast.success("added new JD")

                                fetchJDs();
                            } catch (err: any) {
                                toast.error(err.data?.error || "couldn't add new JD")
                            }
                        }}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow transition"
                    >
                        + Add JD
                    </button>
                </div>
            </div>

            {filteredJD.length > 0 && (
                <p className="text-sm text-gray-600 mt-2 ml-1">
                    Showing {filteredJD.length} JD{filteredJD.length > 1 ? "s" : ""}
                </p>
            )}


            <div className="grid grid-cols-16 gap-3.5 font-semibold text-gray-700 text-sm uppercase tracking-wide mb-2 text-center mt-2">
                <div className="col-span-1 ml-5">Logo</div>

                <div
                    className="col-span-2 cursor-pointer flex justify-center items-center gap-1"
                    onClick={() => toggleSort("company_full")}
                >
                    Company
                    {sortKey === "company_full" && (sortOrder === "asc" ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />)}
                </div>

                <div
                    className="col-span-3 cursor-pointer flex justify-center items-center gap-1"
                    onClick={() => toggleSort("role")}
                >
                    Role
                    {sortKey === "role" && (sortOrder === "asc" ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />)}
                </div>

                <div className="col-span-2">Domain</div>
                <div className="col-span-2">JD</div>

                <div
                    className="col-span-2 cursor-pointer flex justify-center items-center gap-1"
                    onClick={() => toggleSort("placement_cycle_type")}
                >
                    Cycle
                    {sortKey === "placement_cycle_type" && (sortOrder === "asc" ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />)}
                </div>

                <div
                    className="col-span-1 cursor-pointer flex justify-center items-center gap-1"
                    onClick={() => toggleSort("active")}
                >
                    Status
                    {sortKey === "active" && (sortOrder === "asc" ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />)}
                </div>

                <div className="col-span-3">Actions</div>
            </div>

            <AnimatePresence>
                {filteredJD.map((jd) => (
                    <motion.div
                        key={jd.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-16 gap-3.5 items-center bg-white shadow-sm rounded-md px-6 py-4 mb-3"
                    >
                        {editJDId === jd.id ? (
                            <div className="col-span-3 text-center">
                                <button
                                    onClick={() => {
                                        setShowCompanyOverlay(true)
                                        setDomainMenuOpenId(null);
                                        setShowJDOverlay(false);

                                        setEditedJD({
                                            ...jd,
                                            domains: [],
                                        })
                                    }}
                                    className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-cyan-400 text-cyan-700 bg-white rounded-md text-sm hover:bg-cyan-50 transition"
                                >
                                    {editCompany ? (
                                        <>
                                            {editCompany.logo_url ? (
                                                <Image src={editCompany.logo_url} alt="logo" width={24} height={24} className="rounded" />
                                            ) : (
                                                <div className="w-6 h-6 bg-gray-200 rounded" />
                                            )}
                                            <span className="font-medium">{editCompany.company_full}</span>
                                        </>
                                    ) : jd.company_logo && jd.company_full ? (
                                        <>
                                            <Image src={jd.company_logo} alt="logo" width={24} height={24} className="rounded" />
                                            <span className="font-medium">{jd.company_full}</span>
                                        </>
                                    ) : (
                                        <span className="font-medium text-gray-500">Select Company</span>
                                    )}
                                </button>

                                <AnimatePresence>
                                    {showCompanyOverlay && (
                                        <PortalWrapper>
                                            <div
                                                className="fixed inset-0 z-50 flex items-center justify-center bg-white/10 backdrop-blur-sm text-gray-900"
                                                onClick={() => setShowCompanyOverlay(false)}
                                            >
                                                <motion.div
                                                    initial={{ opacity: 0, y: 30 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 20 }}
                                                    transition={{ duration: 0.25 }}
                                                    className="relative w-full max-w-lg mx-4"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="p-4 bg-white/10 backdrop-blur-lg rounded-xl shadow-xl text-gray-900 min-h-96">
                                                        <CompanySearchDropdown
                                                            onSelect={(company) => {
                                                                setEditCompany(company);
                                                                setShowCompanyOverlay(false);
                                                            }}
                                                            permission="MANAGE_COMPANY_JD"
                                                        />
                                                    </div>
                                                </motion.div>
                                            </div>
                                        </PortalWrapper>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <>
                                <div className="col-span-1 flex justify-center items-center">
                                    {jd.company_logo ? (
                                        <Image src={jd.company_logo} alt="logo" width={40} height={40} className="rounded" />
                                    ) : (
                                        <div className="w-10 h-10 bg-gray-200 rounded" />
                                    )}
                                </div>
                                <div className="col-span-2 text-sm text-gray-900 text-left">
                                    {jd.company_full || <span className="text-gray-400">N/A</span>}
                                </div>
                            </>
                        )}


                        {/* JD Role */}
                        <div className="col-span-3 text-sm text-gray-800 text-left">
                            {editJDId === jd.id ? (
                                <input
                                    value={editedJD.role || ""}
                                    onChange={(e) => setEditedJD({ ...editedJD, role: e.target.value })}
                                    className="w-full px-2 py-1 border rounded text-sm"
                                />
                            ) : (
                                <>{highlightMatch(jd.role, selectedRole)}</>
                            )}
                        </div>

                        {/* Domain */}
                        <div className="col-span-2 flex flex-wrap gap-1 relative group justify-center text-center">
                            {(editJDId === jd.id ? editedJD.domains || [] : jd.domains)
                                .slice(0, 4)
                                .map((d, i) => {
                                    const domain = typeof d === "string" ? d : d.domain;
                                    const color = DOMAIN_COLORS[domain] || { bg: "bg-gray-100", text: "text-gray-800" };

                                    return (
                                        <motion.div
                                            key={i}
                                            whileHover={{ scale: 1.05 }}
                                            className={`inline-flex items-center gap-1 ${color.bg} ${color.text} text-xs px-2 py-0.5 rounded transition duration-200`}
                                        >
                                            <span>{domain}</span>
                                            {editJDId === jd.id && (
                                                <button
                                                    onClick={() =>
                                                        setEditedJD((prev) => ({
                                                            ...prev,
                                                            domains: (prev.domains || []).filter((x) => x.domain !== domain),
                                                        }))
                                                    }
                                                    className="hover:text-red-600"
                                                >
                                                    <XMarkIcon className="w-3 h-3" />
                                                </button>
                                            )}
                                        </motion.div>
                                    );
                                })}

                            {(editJDId === jd.id ? editedJD.domains?.length || 0 : jd.domains?.length || 0) > 4 && (
                                <span className="text-gray-500 text-xs font-semibold col-span-2 text-center mt-1">
                                    +{(editJDId === jd.id ? editedJD.domains?.length || 0 : jd.domains?.length || 0) - 4} more
                                </span>
                            )}

                            {editJDId === jd.id && (
                                <motion.button
                                    whileHover={{ scale: 1.2 }}
                                    className="ml-1 p-1 rounded hover:bg-gray-200 transition"
                                    onClick={() => {
                                        setDomainMenuOpenId(jd.id)
                                        setShowCompanyOverlay(false)
                                        setShowJDOverlay(false)

                                        getDomainsForCompany(editCompany?.id ?? jd.company_id)
                                            .then((domains) => setAvailableDomains(domains))
                                            .catch(() => {
                                                toast.error("Failed to load domains");
                                                setAvailableDomains([]);
                                            });
                                    }}
                                >
                                    <PlusIcon className="w-4 h-4 text-gray-600 hover:text-cyan-600" />
                                </motion.button>
                            )}



                            {domainMenuOpenId === jd.id && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 5 }}
                                    className="absolute top-6 left-0 z-10 bg-white shadow-md rounded border p-2 space-y-1"
                                    style={{ top: "calc(100% + 0.5rem)" }}>
                                    {availableDomains.filter(
                                        (d) => !(editedJD.domains || []).some((x) => x.domain === d)
                                    ).length === 0 ? (
                                        <div className="text-sm text-gray-400 italic px-2 py-1 text-center select-none">
                                            No available domains
                                        </div>
                                    ) : (
                                        availableDomains
                                            .filter((d) => !(editedJD.domains || []).some((x) => x.domain === d))
                                            .map((domain) => (
                                                <div
                                                    key={domain}
                                                    onClick={() =>
                                                        setEditedJD((prev) => ({
                                                            ...prev,
                                                            domains: [...(prev.domains || []), { id: 0, domain }],
                                                        }))
                                                    }
                                                    className="cursor-pointer text-sm text-gray-700 hover:text-cyan-700"
                                                >
                                                    {domain}
                                                </div>
                                            ))
                                    )}
                                </motion.div>
                            )}
                        </div>

                        {/* JD Upload/Docx */}
                        <div className="col-span-2 text-sm text-center relative">
                            {editJDId === jd.id ? (
                                <>
                                    <button
                                        onClick={() => {
                                            setShowJDOverlay(true);
                                            setDomainMenuOpenId(null);
                                            setShowCompanyOverlay(false);
                                        }}
                                        className="flex flex-col items-center justify-center mx-auto px-3 py-2 border border-dashed border-gray-400 hover:border-cyan-500 text-gray-700 hover:text-cyan-600 rounded transition"
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                        <span className="text-xs">Upload JD</span>
                                    </button>

                                    {/* Filename (already present or newly selected) */}
                                    {(editedJD.pdf_name || jd.pdf_name) && (
                                        <p className="mt-1 text-xs text-gray-600 truncate">
                                            {editedJD.pdf_name || jd.pdf_name}
                                        </p>
                                    )}

                                    {/* Upload Overlay */}
                                    <AnimatePresence>
                                        {showJDOverlay && (
                                            <PortalWrapper>
                                                <div
                                                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
                                                    onClick={() => setShowJDOverlay(false)}
                                                >
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Upload JD</h3>
                                                        <div className="space-y-3">
                                                            <button
                                                                onClick={() => {
                                                                    const input = document.createElement("input");
                                                                    input.type = "file";
                                                                    input.accept = ".pdf,.doc,.docx";
                                                                    input.onchange = (e: any) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) {
                                                                            toast.success(`Attached ${file.name}`);
                                                                            setEditedJD({
                                                                                ...editedJD,
                                                                                pdf_file: file,
                                                                                pdf_path: URL.createObjectURL(file),
                                                                                pdf_file_name: file.name,
                                                                                isNewPDFUploaded: true,
                                                                                pdf_name: file.name
                                                                            });
                                                                            setShowJDOverlay(false);
                                                                        }
                                                                    };
                                                                    input.click();
                                                                }}
                                                                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow transition"
                                                            >
                                                                From Device
                                                            </button>
                                                            <button
                                                                onClick={() => toast("Drive not supported yet")}
                                                                className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
                                                            >
                                                                From Drive
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                </div>
                                            </PortalWrapper>
                                        )}
                                    </AnimatePresence>
                                </>
                            ) : (
                                jd.pdf_path ? (
                                    <Tooltip.Provider delayDuration={150}>
                                        <Tooltip.Root>
                                            <Tooltip.Trigger asChild>
                                                <a
                                                    href={jd.pdf_path}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-medium px-3 py-1.5 rounded shadow-sm transition"
                                                >
                                                    <DocumentIcon className="w-4 h-4" />
                                                    <span>Preview JD</span>
                                                </a>
                                            </Tooltip.Trigger>
                                            <Tooltip.Portal>
                                                <Tooltip.Content
                                                    side="top"
                                                    sideOffset={6}
                                                    className="rounded-md bg-gray-900 text-white px-3 py-1 text-xs shadow-md z-50"
                                                >
                                                    {jd.pdf_name}
                                                    <Tooltip.Arrow className="fill-gray-900" />
                                                </Tooltip.Content>
                                            </Tooltip.Portal>
                                        </Tooltip.Root>
                                    </Tooltip.Provider>
                                ) : (
                                    <div className="text-gray-400 flex flex-col items-center gap-1">
                                        <DocumentIcon className="w-5 h-5 text-gray-300" />
                                        <span className="text-xs">No JD attached</span>
                                    </div>
                                ))}
                        </div>

                        {/* Cycle */}
                        <div className="col-span-2 text-sm text-center text-gray-800">
                            {editJDId === jd.id ? (
                                <select
                                    value={editedJD.placement_cycle_id || ""}
                                    onChange={(e) => {
                                        setEditedJD({
                                            ...editedJD,
                                            placement_cycle_id: parseInt(e.target.value),
                                            placement_cycle_type: placementCycles.find(c => c.id === parseInt(e.target.value))?.type || ""
                                        })
                                    }}
                                    className="w-full px-2 py-1 border rounded text-sm text-gray-800 bg-white"
                                >
                                    <option value="">Select</option>
                                    {[...placementCycles]
                                        .sort((a, b) => (a.status === "OPEN" && b.status !== "OPEN" ? -1 : 1))
                                        .map((cycle) => (
                                            <option
                                                key={cycle.id}
                                                value={cycle.id}
                                                className={cycle.status === "OPEN" ? "text-green-600 font-semibold" : "text-red-500"}
                                            >
                                                {cycle.label} {cycle.status === "OPEN" ? "(Active)" : "(Inactive)"}
                                            </option>
                                        ))}
                                </select>

                            ) : (
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                                    {
                                        placementCycles.find(pc => pc.id === jd.placement_cycle_id)
                                            ? `${placementCycles.find(pc => pc.id === jd.placement_cycle_id)?.type} ${placementCycles.find(pc => pc.id === jd.placement_cycle_id)?.label?.split(" ").pop()}`
                                            : "N/A"
                                    }
                                </span>
                            )}
                        </div>


                        {/* Active/InActive */}
                        <div className="col-span-1 text-sm text-center text-gray-800">
                            {editJDId === jd.id ? (
                                <select
                                    value={editedJD.active ? "Active" : "Inactive"}
                                    onChange={(e) =>
                                        setEditedJD({ ...editedJD, active: e.target.value === "Active" })
                                    }
                                    className="w-full px-2 py-1 border rounded text-sm"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            ) : (
                                <span className={`font-semibold ${jd.active ? "text-green-600" : "text-red-500"}`}>
                                    {jd.active ? "Active" : "Inactive"}
                                </span>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="col-span-3 flex gap-2 flex-wrap justify-center">
                            {editJDId === jd.id ? (
                                <>
                                    <ActionButton
                                        icon={<PencilIcon className="w-4 h-4" />}
                                        label="Save"
                                        color="bg-green-600"
                                        onClick={() => handleSave()}
                                    />
                                    <ActionButton
                                        icon={<TrashIcon className="w-4 h-4" />}
                                        label="Cancel"
                                        color="bg-gray-600"
                                        onClick={handleCancelEdit}
                                    />
                                </>
                            ) : (
                                <>
                                    <ActionButton
                                        icon={<PencilIcon className="w-4 h-4" />}
                                        label="Edit"
                                        color="bg-cyan-600"
                                        onClick={() => handleEdit(jd.id, jd)}
                                    />
                                    <ActionButton
                                        icon={<TrashIcon className="w-4 h-4" />}
                                        label="Delete"
                                        color="bg-red-500"
                                        onClick={() => handleDelete(jd.id)}
                                    />
                                </>
                            )}
                        </div>

                        {showDeleteFor === jd.id && (
                            <ConfirmRowOverlay
                                message="Delete this JD?"
                                onConfirm={async () => {
                                    await handleDelete(jd.id);
                                }}
                                onCancel={() => setShowDeleteFor(null)}
                            />
                        )}

                    </motion.div>
                ))}


            </AnimatePresence>

            {showLoadingScreen && (
                <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
                    <div className="h-16 w-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(0,255,255,0.6)] mb-4" />
                    <p className="text-cyan-200 text-lg font-medium animate-pulse">Uploading JD Entry...</p>
                </div>
            )}

        </div>
    );
}
