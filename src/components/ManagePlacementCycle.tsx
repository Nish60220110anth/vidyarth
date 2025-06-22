// components/ManagePlacementCycle.tsx
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { PLACEMENT_CYCLE_TYPE, PLACEMENT_CYCLE_STATUS } from "@prisma/client";
import {
    ArrowPathIcon,
    PencilIcon,
    TrashIcon,
    CheckIcon,
    XMarkIcon,
    PlusIcon,
} from "@heroicons/react/24/outline";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";

export interface PlacementCycle {
    id: number;
    year: number;
    batch_name: string;
    placement_type: PLACEMENT_CYCLE_TYPE;
    status: PLACEMENT_CYCLE_STATUS;
}

const TYPE_COLOR: Record<PLACEMENT_CYCLE_TYPE, string> = {
    SUMMERS: "bg-yellow-100 text-yellow-800",
    FINALS: "bg-blue-100 text-blue-800",
    HEPP: "bg-purple-100 text-purple-800",
};

const STATUS_COLOR: Record<PLACEMENT_CYCLE_STATUS, string> = {
    OPEN: "bg-green-100 text-green-800",
    CLOSED: "bg-red-100 text-red-800",
};


export default function ManagePlacementCycle() {
    const [cycles, setCycles] = useState<PlacementCycle[]>([]);
    const [editId, setEditId] = useState<number | null>(null);
    const [newCycle, setNewCycle] = useState<Partial<PlacementCycle>>({});
    const [sortConfig, setSortConfig] = useState<{ key: "batch_name" | "year"; direction: "asc" | "desc" } | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const BATCH_NAME_REGEXES = [
        /^([A-Za-z]+ \d{4}-\d{2})( \/ [A-Za-z]+ \d{4}-\d{2})$/,       // PGP 2023-25 / ABM 2023-25
        /^([A-Za-z]+\/[A-Za-z]+ \d{4}-\d{2})$/,                       // PGP/ABM 2023-25
        /^([A-Za-z]+ \d{4}-\d{2})$/,                                  // PGP 2023-25
    ];
    
    const [batchNameError, setBatchNameError] = useState(false);


    const [filters, setFilters] = useState<{
        placement_type: PLACEMENT_CYCLE_TYPE | "ALL";
        year: string;
        status: PLACEMENT_CYCLE_STATUS | "ALL";
    }>({ placement_type: "ALL", year: "ALL", status: "ALL" });

    const [allCycles, setAllCycles] = useState<PlacementCycle[]>([]);
    const router = useRouter();

    const fetchCycles = async () => {
        setIsRefreshing(true);
        try {
            const res = await fetch("/api/placement-cycles");
            const data = await res.json();
            setCycles(data);
            setAllCycles(data);
        } catch (err) {
            toast.error("Failed to load placement cycles");
            console.error(err);
        } finally {
            setTimeout(() => {
                setIsRefreshing(false)
            }, 1000);
        }
    };

    useEffect(() => {
        fetchCycles();
    }, []);

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
                document.activeElement instanceof HTMLElement && document.activeElement.blur();
            }

            if (e.key === "Enter" && editId !== null) {
                e.preventDefault();
                handleSave();
            }
        };

        document.addEventListener("keydown", handleShortcutCopyPaste);
        return () => document.removeEventListener("keydown", handleShortcutCopyPaste);
    }, [editId]);


    const handleEdit = (id: number) => {
        setEditId(id);
        const cycle = cycles.find((c) => c.id === id);
        if (cycle) setNewCycle(cycle);
    };

    const handleSave = async () => {
        try {
            const res = await fetch(`/api/placement-cycles/${editId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newCycle),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Update failed");
            }

            const updatedCycle = await res.json();
            const updated = cycles.map((c) => (c.id === editId ? updatedCycle : c));
            setCycles(updated);
            setAllCycles(updated);
            toast.success("Placement cycle updated");
            setEditId(null);
        } catch (err: any) {
            toast.error(err.message);
        }

    };

    const handleDelete = async (id: number) => {
        try {
            const res = await fetch(`/api/placement-cycles/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");

            setCycles(cycles.filter((c) => c.id !== id));
            setAllCycles(allCycles.filter((c) => c.id !== id));
            toast.success("Placement cycle deleted");
        } catch (err) {
            toast.error("Failed to delete");
            console.error(err);
        }
    };


    const handleFilter = () => {
        if (allCycles.length === 0) return;
        let filtered = [...allCycles];

        console.log("Applying filters:", filters);
        if (filters.placement_type !== "ALL") {
            filtered = filtered.filter((c) => c.placement_type === filters.placement_type as PLACEMENT_CYCLE_TYPE);
        }
        if (filters.year !== "ALL") {
            filtered = filtered.filter((c) => c.year.toString() === filters.year);
        }
        if (filters.status !== "ALL") {
            filtered = filtered.filter((c) => c.status === filters.status as PLACEMENT_CYCLE_STATUS);
        }
        setCycles(filtered);
    };

    const sortedCycles = [...cycles].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        const valueA = a[key];
        const valueB = b[key];

        if (valueA < valueB) return direction === "asc" ? -1 : 1;
        if (valueA > valueB) return direction === "asc" ? 1 : -1;
        return 0;
    });

    const handleSort = (key: "batch_name" | "year") => {
        setSortConfig((prev) =>
            prev?.key === key
                ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
                : { key, direction: "asc" }
        );
    };


    useEffect(() => {
        handleFilter();
    }, [filters]);

    return (
        <div className="p-6 md:p-10 bg-gray-100 h-full font-[Urbanist]">
            <div className="sticky top-0 z-10 bg-gray-100 pb-4">
                <div className="text-sm text-gray-600 flex gap-2 mb-2">
                    <span onClick={() => router.push("/dashboard")} className="cursor-pointer hover:text-cyan-600">Dashboard</span>
                    <span>/</span>
                    <span className="text-gray-900 font-semibold">Manage Placement Cycles</span>
                </div>

                <motion.h1
                    layoutScroll
                    className="text-2xl md:text-3xl font-bold text-gray-900 mb-6"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    Manage Placement Cycles
                </motion.h1>

                <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
                    <div className="flex flex-wrap gap-4">

                        {/* Placement cycle type  */}
                        <select
                            className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            value={filters.placement_type}
                            onChange={(e) => setFilters({
                                ...filters, placement_type: e.target.value === "ALL"
                                    ? "ALL" :
                                    e.target.value as PLACEMENT_CYCLE_TYPE
                            })}
                        >
                            <option value="ALL">All Types</option>
                            {Object.values(PLACEMENT_CYCLE_TYPE).map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>

                        {/* Years */}
                        <select
                            className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            value={filters.year}
                            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                        >
                            <option value="ALL">All Years</option>
                            {[2022, 2023, 2024, 2025, 2026].map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>

                        {/* Status */}
                        <select
                            className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            value={filters.status}
                            onChange={(e) => setFilters({
                                ...filters, status: e.target.value === "ALL"
                                    ? "ALL"
                                    : e.target.value as PLACEMENT_CYCLE_STATUS
                            })}
                        >
                            <option value="ALL">All Status</option>
                            {Object.values(PLACEMENT_CYCLE_STATUS).map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>

                        <button
                            onClick={async (e) => {
                                await fetchCycles();
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

                    {/* Add cycle */}
                    <button
                        onClick={async () => {
                            try {
                                const res = await fetch("/api/placement-cycles", {
                                    method: "POST",
                                });

                                if (!res.ok) {
                                    const err = await res.json();
                                    throw new Error(err.error || "Creation failed");
                                }

                                const newCycle = await res.json();
                                setAllCycles([...allCycles, newCycle]);
                                setCycles([...cycles, newCycle]);
                                setEditId(newCycle.id);
                                setNewCycle(newCycle);
                                toast.success("Cycle added");
                            } catch (err: any) {
                                toast.error(err.message);
                            }

                        }}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow transition ml-auto"
                    >
                        <PlusIcon className="w-4 h-4 inline mr-1" /> Add Cycle
                    </button>
                </div>

                {/* Headers */}
                <div className="mt-6 grid grid-cols-12 gap-4 items-center text-center font-semibold text-gray-700 text-sm uppercase tracking-wide">
                    <div
                        className="col-span-4 flex items-center justify-center gap-1 cursor-pointer select-none"
                        onClick={() => handleSort("batch_name")}
                    >
                        Batch Name
                        {sortConfig?.key === "batch_name" && (
                            sortConfig.direction === "asc"
                                ? <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                                : <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                        )}
                    </div>

                    <div
                        className="col-span-2 flex items-center justify-center gap-1 cursor-pointer select-none"
                        onClick={() => handleSort("year")}
                    >
                        Year
                        {sortConfig?.key === "year" && (
                            sortConfig.direction === "asc"
                                ? <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                                : <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                        )}
                    </div>

                    <div className="flex-grow text-center col-span-2">Type</div>
                    <div className="flex-grow text-center col-span-2">Status</div>
                    <div className="col-span-2 flex justify-center items-center text-center">Actions</div>
                </div>

            </div>

            {/* Content */}
            {cycles.length === 0 ? (
                <p className="text-gray-500 text-center mt-10 text-base">No placement cycles available.</p>
            ) : (sortedCycles.map((c) => {
                const isEditing = editId === c.id;
                return (
                    <motion.div
                        key={c.id}
                        layoutScroll
                        className="grid grid-cols-12 gap-4 items-center bg-white p-4 rounded-lg shadow-sm mb-4 text-gray-800 hover:bg-gray-50 transition-colors"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="col-span-4 text-center relative">
                            {isEditing ? (
                                <>                                
                                <input
                                    type="text"
                                    value={newCycle.batch_name || ""}
                                    onChange={(e) => {
                                        const value = e.target.value.trim();
                                        setNewCycle({ ...newCycle, batch_name: e.target.value });
                                        const isValid = BATCH_NAME_REGEXES.some((regex) => regex.test(value.trim()));
                                        setBatchNameError(!isValid);
                                    }}
                                    className={`w-full px-2 py-1 border rounded-md ${batchNameError ? "border-red-500" : "border-gray-300"
                                        }`}
                                />
                                    {batchNameError && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-3 py-1 text-xs bg-red-100 text-red-700 rounded shadow max-w-xs z-10 text-left">
                                            Valid formats:<br />
                                            • PGP 2023-25 / ABM 2023-25<br />
                                            • PGP/ABM 2023-25<br />
                                            • PGP 2023-25<br />
                                        </div>
                                    )}
                                </>
                            ) : (
                                c.batch_name
                            )}
                        </div>
                        <div className="col-span-2 text-center relative">
                            {isEditing ? (
                                <input
                                    type="number"
                                    value={newCycle.year || ""}
                                    onChange={(e) => setNewCycle({ ...newCycle, year: parseInt(e.target.value) })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md"
                                />
                            ) : (
                                c.year
                            )}
                        </div>
                        <div className="col-span-2 text-center">
                            {isEditing ? (
                                <select
                                    value={newCycle.placement_type || PLACEMENT_CYCLE_TYPE.SUMMERS}
                                    onChange={(e) => setNewCycle({ ...newCycle, placement_type: e.target.value as PLACEMENT_CYCLE_TYPE })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md"
                                >
                                    {Object.values(PLACEMENT_CYCLE_TYPE).map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            ) : (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLOR[c.placement_type]}`}>
                                    {c.placement_type}
                                </span>
                            )}
                        </div>
                        <div className="col-span-2 text-center">
                            {isEditing ? (
                                <select
                                    value={newCycle.status || PLACEMENT_CYCLE_STATUS.OPEN}
                                    onChange={(e) => setNewCycle({ ...newCycle, status: e.target.value as PLACEMENT_CYCLE_STATUS })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md"
                                >
                                    {Object.values(PLACEMENT_CYCLE_STATUS).map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            ) : (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[c.status]}`}>
                                    {c.status}
                                </span>

                            )}
                        </div>

                        <div className="col-span-2 flex justify-center items-center gap-2 text-center">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={handleSave}
                                        disabled={batchNameError}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md text-sm shadow hover:bg-green-700 transition"
                                    >
                                        <CheckIcon className="w-4 h-4" /> Save
                                    </button>
                                    <button
                                        onClick={() => setEditId(null)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded-md text-sm shadow hover:bg-gray-700 transition"
                                    >
                                        <XMarkIcon className="w-4 h-4" /> Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleEdit(c.id)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 text-white rounded-md text-sm shadow hover:bg-cyan-700 transition"
                                    >
                                        <PencilIcon className="w-4 h-4" /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(c.id)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-md text-sm shadow hover:bg-red-600 transition"
                                    >
                                        <TrashIcon className="w-4 h-4" />  Delete
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                );
            }
            ))}
        </div>
    );
}