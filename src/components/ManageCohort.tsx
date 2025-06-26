import { useRouter } from "next/router";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import axios from "axios";
import { CheckIcon, PencilIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { ArrowDownTrayIcon, ArrowPathIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { PLACEMENT_CYCLE_TYPE } from "@prisma/client";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface DishaUser {
    id: number;
    name: string;
}

interface StudentUser {
    id: number;
    name: string;
    pgpid: string;
    pcomid: string;
    disha_profile: { mentor_id: number | null, placement_cycle?: { placement_type: string } | null; } | null;
    shadow_as_user1: { user1Id: number, user2Id: number };
    shadow_as_user2: { user1Id: number, user2Id: number };
}

type SortField = "disha" | "pcomid" | "pgpid";
type SortDirection = "asc" | "desc";


const TYPE_COLOR: Record<PLACEMENT_CYCLE_TYPE, string> = {
    SUMMERS: "bg-yellow-300/20 text-yellow-300",
    FINALS: "bg-cyan-300/20 text-cyan-300",
    HEPP: "bg-purple-300/20 text-purple-300",
};

export default function ManageCohort() {
    const router = useRouter();

    const [dishaUsers, setDishaUsers] = useState<DishaUser[]>([]);
    const [students, setStudents] = useState<StudentUser[]>([]);

    const [selectedDishaId, setSelectedDishaId] = useState<string>("ALL");
    const [dishaAssigned, setDishaAssigned] = useState<string>("ALL");
    const [shadowAssigned, setShadowAssigned] = useState<string>("ALL");

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);


    // sorting functionality
    const [sortKey, setSortKey] = useState<SortField | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");


    const [editId, setEditId] = useState<number | null>(null);
    const [editStudent, setEditStudent] = useState<{
        dishaId: number | null;
        shadowPcomId: string;
    }>({ dishaId: null, shadowPcomId: "" });


    useEffect(() => {
        axios.get("/api/users?role=DISHA")
            .then((res) => {
                setDishaUsers(res.data.map((u: any) => ({ id: u.id, name: u.name })));
            })
            .catch(() => toast.error("Failed to load DISHA users"));

        axios.get("/api/users?role=STUDENT")
            .then((res) => {
                const sanitized: StudentUser[] = res.data.map((u: any) => ({
                    id: u.id,
                    name: u.name,
                    pgpid: u.pgpid,
                    pcomid: u.pcomid,
                    disha_profile: u.disha_profile ?? { mentor_id: null },
                    shadow_as_user1: u.shadow_as_user1 ?? {},
                    shadow_as_user2: u.shadow_as_user2 ?? {},
                }));
                setStudents(sanitized);

            })
            .catch(() => toast.error("Failed to load students"));
    }, []);

    const refreshStudents = async () => {
        try {
            setIsRefreshing(true);
            const res = await axios.get("/api/users?role=STUDENT");
            const sanitized: StudentUser[] = res.data.map((u: any) => ({
                id: u.id,
                name: u.name,
                pgpid: u.pgpid,
                pcomid: u.pcomid,
                disha_profile: u.disha_profile ?? { mentor_id: null },
                shadow_as_user1: u.shadow_as_user1 ?? {},
                shadow_as_user2: u.shadow_as_user2 ?? {},
            }));
            setStudents(sanitized);
            toast.success("Students refreshed");
        } catch {
            toast.error("Failed to refresh students");
        } finally {
            setTimeout(() => setIsRefreshing(false), 500);
        }
    };


    const getDishaName = (mentorId: number | null) => {
        if (!mentorId) return "Unassigned";
        const mentor = dishaUsers.find((d) => d.id === mentorId);
        return mentor ? mentor.name : "Unknown";
    };

    const getShadowData = (studentId: number) => {
        // Find the pair where the student is either user1 or user2
        const pair = students.find((s) => {
            const pair1 = s.shadow_as_user1;
            const pair2 = s.shadow_as_user2;

            const isPair1 = pair1?.user1Id === studentId || pair1?.user2Id === studentId;
            const isPair2 = pair2?.user1Id === studentId || pair2?.user2Id === studentId;

            return (isPair1 || isPair2) && s.id !== studentId;
        });

        return pair
            ? { name: pair.name, pcomid: pair.pcomid }
            : { name: "Unassigned", pcomid: "-" };
    };


    const filteredStudents = students.filter((student) => {
        const mentorId = student.disha_profile?.mentor_id;

        const matchDisha = selectedDishaId === "ALL" || mentorId?.toString() === selectedDishaId;
        const matchDishaAssigned =
            dishaAssigned === "ALL" ||
            (dishaAssigned === "YES" && mentorId) ||
            (dishaAssigned === "NO" && !mentorId);
        const shadow = getShadowData(student.id);
        const matchShadow =
            shadowAssigned === "ALL" ||
            (shadowAssigned === "YES" && shadow.name !== "Unassigned") ||
            (shadowAssigned === "NO" && shadow.name === "Unassigned");

        return matchDisha && matchDishaAssigned && matchShadow;
    });

    const sortedStudents = [...filteredStudents].sort((a, b) => {
        if (!sortKey) return 0;

        let aValue = "";
        let bValue = "";

        if (sortKey === "disha") {
            aValue = getDishaName(a.disha_profile?.mentor_id ?? null);
            bValue = getDishaName(b.disha_profile?.mentor_id ?? null);
        } else if (sortKey === "pcomid") {
            let aValue1 = Number(a.pcomid);
            let bValue1 = Number(b.pcomid);

            const comparison = (aValue1 - bValue1);
            return sortDirection === "asc" ? comparison : -comparison;
        } else if (sortKey === "pgpid") {
            aValue = a.pgpid;
            bValue = b.pgpid;
        }

        const comparison = aValue.localeCompare(bValue);
        return sortDirection === "asc" ? comparison : -comparison;
    });

    const toggleSort = (field: SortField) => {
        if (sortKey === field) {
            setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(field);
            setSortDirection("asc");
        }
    };

    const buildFileName = () => {
        const getSlug = (value: string) =>
            value.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/gi, "");

        const dishaName = selectedDishaId !== "ALL"
            ? getSlug(dishaUsers.find(d => d.id.toString() === selectedDishaId)?.name || "unknown_disha")
            : null;

        const dishaStatus = selectedDishaId === "ALL"
            ? dishaAssigned === "ALL"
                ? "any_disha_status"
                : dishaAssigned === "YES"
                    ? "disha_assigned"
                    : "disha_unassigned"
            : null;

        const shadowStatus =
            shadowAssigned === "ALL"
                ? ""
                : shadowAssigned === "YES"
                    ? "shadow_assigned"
                    : "shadow_unassigned";

        const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

        const fileNameParts = ["cohort"];

        if (dishaName) fileNameParts.push(dishaName);
        else if (dishaStatus) fileNameParts.push(dishaStatus);

        fileNameParts.push(shadowStatus, dateStr);

        return `${fileNameParts.join("_")}.xlsx`;
    };
      

    const exportToExcel = async () => {
        setIsDownloading(true);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Cohort");

        // Define columns
        sheet.columns = [
            { header: "Cohort", key: "disha", width: 20 },
            { header: "PCOM ID", key: "pcomid", width: 12 },
            { header: "PGP ID", key: "pgpid", width: 12 },
            { header: "Name", key: "name", width: 25 },
            { header: "Cycle", key: "cycle", width: 14 },
            { header: "Shadow(PCOMID)", key: "shadowPcomid", width: 16 },
            { header: "Shadow Name", key: "shadowName", width: 25 },
        ];

        // Add styled rows
        sortedStudents.forEach((student) => {
            const shadow = getShadowData(student.id);
            const dishaName = getDishaName(student.disha_profile?.mentor_id ?? null);

            sheet.addRow({
                disha: dishaName,
                pcomid: student.pcomid,
                pgpid: student.pgpid,
                name: student.name,
                cycle: student.disha_profile?.placement_cycle?.placement_type || "N/A",
                shadowPcomid: shadow.pcomid,
                shadowName: shadow.name,
            });
        });

        // Style header row
        sheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true };
            cell.alignment = { vertical: "middle", horizontal: "center" };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF1E293B" },
            };
            cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
        });

        // Center all body cells
        sheet.eachRow((row, _rowNumber) => {
            row.eachCell((cell) => {
                cell.alignment = { vertical: "middle", horizontal: "center" };
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), buildFileName());

        setTimeout(() => setIsDownloading(false), 1000);
      };


    return (
        <div className="p-6 md:p-10 bg-gray-100 h-full font-[Urbanist]">
            <div className="sticky top-0 z-10 bg-gray-100 pb-4">
                <div className="text-sm text-gray-600 flex gap-2 mb-2">
                    <span onClick={() => router.push("/dashboard")} className="cursor-pointer hover:text-cyan-600">Dashboard</span>
                    <span>/</span>
                    <span className="text-gray-900 font-semibold">Manage Cohort</span>
                </div>

                <motion.h1
                    layoutScroll
                    className="text-2xl md:text-3xl font-bold text-gray-900 mb-4"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    Manage Cohort
                </motion.h1>


                <div className="mt-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col text-gray-600">
                            <label className="mb-1 text-xs">Filter by DISHA Mentor</label>
                            <select
                                className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                value={selectedDishaId}
                                onChange={(e) => setSelectedDishaId(e.target.value)}
                            >
                                <option value="ALL">All</option>
                                {dishaUsers.map((user) => (
                                    <option key={user.id} value={user.id}>{user.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col text-gray-600">
                            <label className="mb-1 text-xs">DISHA Assignment Status</label>
                            <select
                                className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                value={dishaAssigned}
                                onChange={(e) => setDishaAssigned(e.target.value)}
                            >
                                <option value="ALL">All</option>
                                <option value="YES">Assigned</option>
                                <option value="NO">Unassigned</option>
                            </select>
                        </div>

                        <div className="flex flex-col text-xs text-gray-600">
                            <label className="mb-1 text-xs">Shadow Assignment Status</label>
                            <select
                                className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                value={shadowAssigned}
                                onChange={(e) => setShadowAssigned(e.target.value)}
                            >
                                <option value="ALL">All</option>
                                <option value="YES">Assigned</option>
                                <option value="NO">Unassigned</option>
                            </select>
                        </div>

                        <div className="mt-5">
                            <button
                                onClick={refreshStudents}
                                className="p-2 rounded-md border border-gray-300 text-gray-600 hover:text-cyan-600 hover:border-cyan-500 transition shadow-sm hover:shadow-md"
                                title="Refresh student list"
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

                    </div>

                    <button
                        onClick={exportToExcel}
                        className="ml-2 px-3 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 
                        text-white text-sm font-medium shadow-sm transition flex flex-row mt-1 items-center"
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

                </div>
            </div>


            {filteredStudents.length > 0 && (
                <p className="text-sm text-gray-600 mt-2 ml-1">
                    Showing {filteredStudents.length} student{filteredStudents.length > 1 ? "s" : ""}
                </p>
            )}


            {/* Table */}
            <div className="overflow-auto mt-6">
                <table className="min-w-full text-sm rounded-lg overflow-hidden border border-gray-700 bg-gray-900 shadow-sm table-fixed">
                    <motion.thead
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="bg-gray-200 text-gray-700 uppercase tracking-wide">

                        <tr>
                            <th className="w-[18%] px-3 py-2 text-left cursor-pointer">
                                <div className="flex items-center" onClick={() => {
                                    toggleSort("disha")
                                }}>
                                    DISHA Cohort
                                    {sortKey === "disha" &&
                                        (sortDirection === "asc"
                                            ? <ChevronUpIcon className="w-4 h-4 ml-1" />
                                            : <ChevronDownIcon className="w-4 h-4 ml-1" />
                                        )}
                                </div>
                            </th>

                            <th className="w-[12%] px-3 py-2 text-center cursor-pointer">
                                <div className="flex items-center justify-center" onClick={() => {
                                    toggleSort("pcomid")
                                }}>
                                    PCOM ID
                                    {sortKey === "pcomid" && (
                                        sortDirection === "asc"
                                            ? <ChevronUpIcon className="w-4 h-4 ml-1" />
                                            : <ChevronDownIcon className="w-4 h-4 ml-1" />
                                    )}
                                </div>
                            </th>

                            <th className="w-[12%] px-3 py-2 text-center cursor-pointer">
                                <div className="flex items-center justify-center" onClick={() => {
                                    toggleSort("pgpid")
                                }}>
                                    PGP ID
                                    {sortKey === "pgpid" && (
                                        sortDirection === "asc"
                                            ? <ChevronUpIcon className="w-4 h-4 ml-1" />
                                            : <ChevronDownIcon className="w-4 h-4 ml-1" />
                                    )}
                                </div>
                            </th>

                            <th className="px-3 py-2 text-left w-[20%]">Name</th>
                            <th className="px-3 py-2 text-left w-[14%]">Cycle Type</th>
                            <th className="px-3 py-2 text-center w-[12%]">PCOMID Shadow</th>
                            <th className="px-3 py-2 text-left w-[14%]">Shadow Name</th>
                            <th className="px-3 py-2 text-left w-[8%]">Actions</th>

                        </tr>

                    </motion.thead>
                </table>

                <div className="max-h-[65vh] overflow-y-auto scroll-smooth scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-800">
                    <table className="min-w-full text-sm table-fixed border border-gray-800 bg-gray-900">
                        <tbody>
                            {sortedStudents.map((student) => {
                                const isEditing = editId === student.id;
                                const shadow = getShadowData(student.id);
                                const dishaName = getDishaName(student.disha_profile?.mentor_id ?? null);

                                return (
                                    <tr key={student.id} className="border-b hover:bg-gray-800 transition duration-200 ease-in-out align-middle hover:shadow-[0_0_8px_1px_rgba(0,255,255,0.3)] text-white">
                                        <td className="w-[18%] px-3 py-2 text-left font-semibold ">
                                            {isEditing ? (
                                                <select
                                                    className="w-full border-b bg-gray-900 border-gray-800 hover:bg-gray-800 hover:shadow-sm transition duration-200 ease-in-out align-middle rounded-md px-2 py-1"
                                                    value={editStudent.dishaId ?? ""}
                                                    onChange={(e) =>
                                                        setEditStudent({ ...editStudent, dishaId: parseInt(e.target.value) })
                                                    }
                                                >
                                                    <option value="">Unassigned</option>
                                                    {dishaUsers.map((d) => (
                                                        <option key={d.id} value={d.id}>
                                                            {d.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                dishaName
                                            )}
                                        </td>
                                        <td className="w-[12%] px-3 py-2 text-center font-mono">{student.pcomid}</td>
                                        <td className="w-[12%] px-3 py-2 text-center font-mono tracking-wide uppercase">{student.pgpid}</td>
                                        <td className="w-[20%] px-3 py-2 text-left font-medium">{student.name}</td>
                                        <td className="w-[14%] px-3 py-2 text-left">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLOR[student.disha_profile?.placement_cycle?.placement_type as PLACEMENT_CYCLE_TYPE]}`}>
                                                {student.disha_profile?.placement_cycle?.placement_type || "N/A"}
                                            </span>
                                        </td>
                                        <td className="w-[12%] px-3 py-2 text-center">
                                            {isEditing ? (
                                                <select
                                                    className="w-full border-b bg-gray-900 border-gray-800 hover:bg-gray-800 hover:shadow-sm transition duration-200 ease-in-out align-middle rounded-md px-2 py-1"
                                                    value={editStudent.shadowPcomId}
                                                    onChange={(e) => {
                                                        setEditStudent({ ...editStudent, shadowPcomId: e.target.value });
                                                    }}
                                                >
                                                    <option value="">Unassigned</option>
                                                    {students
                                                        .filter((s) => s.id !== student.id)
                                                        .sort((a, b) => a.pcomid.localeCompare(b.pcomid))
                                                        .map((s) => (
                                                            <option key={s.id} value={s.pcomid}>
                                                                {s.pcomid} ({s.name})
                                                            </option>
                                                        ))}
                                                </select>

                                            ) : (
                                                shadow.pcomid
                                            )}
                                        </td>
                                        <td className="w-[14%] px-3 py-2 text-left italic">{shadow.name}</td>
                                        <td className="w-[8%] px-3 py-2 text-left">
                                            {isEditing ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            try {

                                                                console.log(student.id, editStudent.dishaId, editStudent.shadowPcomId.trim())
                                                                const res = await axios.put("/api/users/update-cohort", {
                                                                    studentId: student.id,
                                                                    dishaId: editStudent.dishaId,
                                                                    shadowPcomId: editStudent.shadowPcomId.trim(),
                                                                });

                                                                if (!res.data.success) {
                                                                    toast.error(res.data.error)
                                                                    return;
                                                                };

                                                                const idsToFetch = [student.id];

                                                                if (res.data.updatedShadowUser) {
                                                                    idsToFetch.push(res.data.updatedShadowUser.id);
                                                                }

                                                                if (res.data.removedShadowUser) {
                                                                    idsToFetch.push(res.data.removedShadowUser.id);
                                                                }

                                                                const refreshedRes = await axios.post("/api/users/get-specific", {
                                                                    ids: idsToFetch,
                                                                });

                                                                const updatedUsers = refreshedRes.data;
                                                                const updatedStudents = students.map((s) => {
                                                                    const updated = updatedUsers.find((u: StudentUser) => u.id === s.id);
                                                                    return updated ? updated : s;
                                                                });
                                                                updatedUsers.forEach((u: StudentUser) => {
                                                                    if (!updatedStudents.find((s) => s.id === u.id)) {
                                                                        updatedStudents.push(u);
                                                                    }
                                                                });

                                                                setStudents(updatedStudents);

                                                                toast.success("Student updated");
                                                                setEditId(null);

                                                            } catch (err: any) {
                                                                const message =
                                                                    err.response?.data?.error ||
                                                                    err.message ||
                                                                    "Update failed";
                                                                toast.error(message);
                                                            }
                                                        }}
                                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm flex items-center gap-1"
                                                    >
                                                        <CheckIcon className="w-4 h-4" />
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => setEditId(null)}
                                                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-md text-sm flex items-center gap-1"
                                                    >
                                                        <XMarkIcon className="w-4 h-4" />
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        const shadow = getShadowData(student.id);
                                                        setEditId(student.id);
                                                        setEditStudent({
                                                            dishaId: student.disha_profile?.mentor_id ?? null,
                                                            shadowPcomId: shadow.pcomid ?? "",
                                                        });
                                                    }}


                                                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1.5 rounded-md text-sm flex items-center gap-1"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                    Edit
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
