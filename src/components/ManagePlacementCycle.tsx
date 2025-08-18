// components/ManagePlacementCycle.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
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
import {
    createCycle,
    deleteCycle,
    fetchAllCyclesWithDetails,
    updateCycle,
} from "@/lib/api/cycle";

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
    const router = useRouter();

    const [cycles, setCycles] = useState<PlacementCycle[]>([]);
    const [editId, setEditId] = useState<number | null>(null);
    const [newCycle, setNewCycle] = useState<Partial<PlacementCycle>>({});
    const [sortConfig, setSortConfig] = useState<{
        key: "batch_name" | "year";
        direction: "asc" | "desc";
    } | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Valid examples:
    // • PGP 2023-25 / ABM 2023-25
    // • PGP/ABM 2023-25
    // • PGP 2023-25
    const BATCH_NAME_REGEXES = [
        /^([A-Za-z]+ \d{4}-\d{2})\s*\/\s*([A-Za-z]+ \d{4}-\d{2})$/, // PGP 2023-25 / ABM 2023-25
        /^([A-Za-z]+\/[A-Za-z]+ \d{4}-\d{2})$/, // PGP/ABM 2023-25
        /^([A-Za-z]+ \d{4}-\d{2})$/, // PGP 2023-25
    ];

    const [batchNameError, setBatchNameError] = useState(false);

    const [filters, setFilters] = useState<{
        placement_type: PLACEMENT_CYCLE_TYPE | "ALL";
        year: string;
        status: PLACEMENT_CYCLE_STATUS | "ALL";
    }>({ placement_type: "ALL", year: "ALL", status: "ALL" });

    const [allCycles, setAllCycles] = useState<PlacementCycle[]>([]);

    const fetchCycles = async () => {
        setIsRefreshing(true);
        const res = await fetchAllCyclesWithDetails();
        setCycles(res);
        setAllCycles(res);
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    useEffect(() => {
        fetchCycles();
    }, []);

    useEffect(() => {
        const handleShortcutCopyPaste = async (e: KeyboardEvent) => {
            const active = document.activeElement as
                | HTMLInputElement
                | HTMLTextAreaElement
                | null;

            if (!active || active.tagName === "INPUT" || active.tagName === "TEXTAREA")
                return;

            if (e.ctrlKey && e.shiftKey && e.code === "KeyC") {
                e.preventDefault();
                const selectedText = active.value.substring(
                    (active as any).selectionStart || 0,
                    (active as any).selectionEnd || 0
                );
                await navigator.clipboard.writeText(selectedText);
            }

            if (e.ctrlKey && e.shiftKey && e.code === "KeyV") {
                e.preventDefault();
                const pasteText = await navigator.clipboard.readText();
                const start = (active as any).selectionStart || 0;
                const end = (active as any).selectionEnd || 0;
                const before = (active as any).value.substring(0, start);
                const after = (active as any).value.substring(end);
                const newValue = before + pasteText + after;

                const nativeSetter = Object.getOwnPropertyDescriptor(
                    HTMLInputElement.prototype,
                    "value"
                )?.set;
                nativeSetter?.call(active, newValue);
                active.dispatchEvent(new Event("input", { bubbles: true }));
                (active as any).setSelectionRange(
                    before.length + pasteText.length,
                    before.length + pasteText.length
                );
            }

            if (e.key === "Escape") {
                document.activeElement instanceof HTMLElement &&
                    document.activeElement.blur();
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
        if (!editId) return;
        const updatedCycle = await updateCycle(editId, newCycle);
        if (!updatedCycle) return;

        setCycles((prev) => prev.map((c) => (c.id === editId ? updatedCycle : c)));
        setAllCycles((prev) => prev.map((c) => (c.id === editId ? updatedCycle : c)));
        setEditId(null);
    };

    const handleDelete = async (id: number) => {
        await deleteCycle(id);
        setAllCycles((prev) => prev.filter((g) => g.id !== id));
        setCycles((prev) => prev.filter((g) => g.id !== id));
    };

    const handleNewCycle = async () => {
        const created = await createCycle();
        setAllCycles((prev) => [...prev, created]); // functional update (prevents race)
        setCycles((prev) => [...prev, created]);
        setEditId(created.id);
        setNewCycle(created);
    };

    const filtered = useMemo(() => {
        let list = [...allCycles];
        if (filters.placement_type !== "ALL") {
            list = list.filter(
                (c) => c.placement_type === (filters.placement_type as PLACEMENT_CYCLE_TYPE)
            );
        }
        if (filters.year !== "ALL") {
            list = list.filter((c) => c.year.toString() === filters.year);
        }
        if (filters.status !== "ALL") {
            list = list.filter((c) => c.status === (filters.status as PLACEMENT_CYCLE_STATUS));
        }
        return list;
    }, [allCycles, filters]);

    useEffect(() => {
        setCycles(filtered);
    }, [filtered]);

    const sortedCycles = useMemo(() => {
        if (!sortConfig) return cycles;
        const { key, direction } = sortConfig;
        const copy = [...cycles];
        copy.sort((a, b) => {
            const valueA = a[key];
            const valueB = b[key];
            if (valueA < valueB) return direction === "asc" ? -1 : 1;
            if (valueA > valueB) return direction === "asc" ? 1 : -1;
            return 0;
        });
        return copy;
    }, [cycles, sortConfig]);

    const handleSort = (key: "batch_name" | "year") => {
        setSortConfig((prev) =>
            prev?.key === key
                ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
                : { key, direction: "asc" }
        );
    };

    return (
        <div className="p-4 sm:p-6 md:p-10 bg-gray-100 min-h-full font-[Urbanist]">
            <div className="sticky top-0 z-10 bg-gray-100/95 backdrop-blur supports-[backdrop-filter]:bg-gray-100/80 pb-4">
                {/* Breadcrumbs */}
                <div className="text-xs sm:text-sm text-gray-600 flex flex-wrap gap-2 mb-2">
                    <span
                        onClick={() => router.push("/")}
                        className="cursor-pointer hover:text-cyan-600"
                    >
                        Dashboard
                    </span>
                    <span>/</span>
                    <span className="text-gray-900 font-semibold">Manage Placement Cycles</span>
                </div>

                {/* Title */}
                <motion.h1
                    layoutScroll
                    className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-6"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    Manage Placement Cycles
                </motion.h1>

                {/* Controls */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                        {/* Type */}
                        <select
                            className="w-full sm:w-auto px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            value={filters.placement_type}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    placement_type:
                                        e.target.value === "ALL"
                                            ? "ALL"
                                            : (e.target.value as PLACEMENT_CYCLE_TYPE),
                                })
                            }
                            aria-label="Filter by placement type"
                        >
                            <option value="ALL">All Types</option>
                            {Object.values(PLACEMENT_CYCLE_TYPE).map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>

                        {/* Year */}
                        <select
                            className="w-full sm:w-auto px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            value={filters.year}
                            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                            aria-label="Filter by year"
                        >
                            <option value="ALL">All Years</option>
                            {[2022, 2023, 2024, 2025, 2026].map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>

                        {/* Status */}
                        <select
                            className="w-full sm:w-auto px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            value={filters.status}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    status:
                                        e.target.value === "ALL"
                                            ? "ALL"
                                            : (e.target.value as PLACEMENT_CYCLE_STATUS),
                                })
                            }
                            aria-label="Filter by status"
                        >
                            <option value="ALL">All Status</option>
                            {Object.values(PLACEMENT_CYCLE_STATUS).map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={fetchCycles}
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
                        onClick={handleNewCycle}
                        className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow transition"
                    >
                        <PlusIcon className="w-4 h-4 inline mr-1" /> Add Cycle
                    </button>
                </div>

                {/* Header row (desktop only) */}
                <div className="hidden md:grid mt-2 grid-cols-12 gap-4 items-center text-center font-semibold text-gray-700 text-sm uppercase tracking-wide">
                    <div
                        className="col-span-4 flex items-center justify-center gap-1 cursor-pointer select-none"
                        onClick={() => handleSort("batch_name")}
                    >
                        Batch Name
                        {sortConfig?.key === "batch_name" &&
                            (sortConfig.direction === "asc" ? (
                                <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                            ) : (
                                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                            ))}
                    </div>

                    <div
                        className="col-span-2 flex items-center justify-center gap-1 cursor-pointer select-none"
                        onClick={() => handleSort("year")}
                    >
                        Year
                        {sortConfig?.key === "year" &&
                            (sortConfig.direction === "asc" ? (
                                <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                            ) : (
                                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                            ))}
                    </div>

                    <div className="col-span-2 text-center">Type</div>
                    <div className="col-span-2 text-center">Status</div>
                    <div className="col-span-2 text-center">Actions</div>
                </div>
            </div>

            {/* Content */}
            {sortedCycles.length === 0 ? (
                <div className="flex items-center justify-center py-16 md:py-24">
                    <p className="text-gray-500 text-center text-base">
                        No placement cycles available.
                    </p>
                </div>
            ) : (
                sortedCycles.map((c) => {
                    const isEditing = editId === c.id;
                    return (
                        <motion.div
                            key={c.id}
                            layoutScroll
                            className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center bg-white p-4 rounded-lg shadow-sm mb-4 text-gray-800 hover:bg-gray-50 transition-colors"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Batch Name */}
                            <div className="md:col-span-4 text-left md:text-center relative">
                                <div className="md:hidden text-[11px] text-gray-500 mb-1">
                                    Batch Name
                                </div>
                                {isEditing ? (
                                    <>
                                        <input
                                            type="text"
                                            value={newCycle.batch_name || ""}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setNewCycle({ ...newCycle, batch_name: value });
                                                const isValid = BATCH_NAME_REGEXES.some((regex) =>
                                                    regex.test(value.trim())
                                                );
                                                setBatchNameError(!isValid);
                                            }}
                                            className={`w-full px-2 py-1 border rounded-md ${batchNameError ? "border-red-500" : "border-gray-300"
                                                }`}
                                            aria-invalid={batchNameError}
                                            aria-describedby={
                                                batchNameError ? "batchname-error" : undefined
                                            }
                                        />
                                        {batchNameError && (
                                            <div
                                                id="batchname-error"
                                                className="absolute top-full left-0 md:left-1/2 md:-translate-x-1/2 mt-1 px-3 py-1 text-xs bg-red-100 text-red-700 rounded shadow max-w-xs z-10 text-left"
                                            >
                                                Valid formats:
                                                <br />• PGP 2023-25 / ABM 2023-25
                                                <br />• PGP/ABM 2023-25
                                                <br />• PGP 2023-25
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <span className="truncate inline-block max-w-full">{c.batch_name}</span>
                                )}
                            </div>

                            {/* Year */}
                            <div className="md:col-span-2 text-left md:text-center">
                                <div className="md:hidden text-[11px] text-gray-500 mb-1">Year</div>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        value={newCycle.year || ""}
                                        onChange={(e) =>
                                            setNewCycle({ ...newCycle, year: parseInt(e.target.value || "0") })
                                        }
                                        className="w-full px-2 py-1 border border-gray-300 rounded-md"
                                    />
                                ) : (
                                    c.year
                                )}
                            </div>

                            {/* Type */}
                            <div className="md:col-span-2 text-left md:text-center">
                                <div className="md:hidden text-[11px] text-gray-500 mb-1">Type</div>
                                {isEditing ? (
                                    <select
                                        value={newCycle.placement_type || PLACEMENT_CYCLE_TYPE.SUMMERS}
                                        onChange={(e) =>
                                            setNewCycle({
                                                ...newCycle,
                                                placement_type: e.target.value as PLACEMENT_CYCLE_TYPE,
                                            })
                                        }
                                        className="w-full px-2 py-1 border border-gray-300 rounded-md"
                                    >
                                        {Object.values(PLACEMENT_CYCLE_TYPE).map((t) => (
                                            <option key={t} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLOR[c.placement_type]}`}
                                    >
                                        {c.placement_type}
                                    </span>
                                )}
                            </div>

                            {/* Status */}
                            <div className="md:col-span-2 text-left md:text-center">
                                <div className="md:hidden text-[11px] text-gray-500 mb-1">Status</div>
                                {isEditing ? (
                                    <select
                                        value={newCycle.status || PLACEMENT_CYCLE_STATUS.OPEN}
                                        onChange={(e) =>
                                            setNewCycle({
                                                ...newCycle,
                                                status: e.target.value as PLACEMENT_CYCLE_STATUS,
                                            })
                                        }
                                        className="w-full px-2 py-1 border border-gray-300 rounded-md"
                                    >
                                        {Object.values(PLACEMENT_CYCLE_STATUS).map((s) => (
                                            <option key={s} value={s}>
                                                {s}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[c.status]}`}
                                    >
                                        {c.status}
                                    </span>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="md:col-span-2 flex gap-2 flex-wrap justify-start md:justify-center">
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={handleSave}
                                            disabled={batchNameError}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md text-sm shadow hover:bg-green-700 transition disabled:opacity-60"
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
                                            <TrashIcon className="w-4 h-4" /> Delete
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    );
                })
            )}
        </div>
    );
}
