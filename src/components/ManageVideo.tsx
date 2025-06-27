// components/ManageVideoList.tsx
import { useState, useEffect, JSX } from "react";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { DocumentIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/solid";
import { PlusIcon, ArrowPathIcon, ArrowDownTrayIcon, ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/router";
import CompanySearchDropdown, { Company } from "./CompanySearchDropDown";
import PortalWrapper from "./PortableWrapper";
import { VIDEO_REQ, VIDEO_STREAM_SOURCE } from "@prisma/client";
import axios from "axios";
import ConfirmRowOverlay from "./ConfirmOverlay";
import * as Tooltip from "@radix-ui/react-tooltip";
interface VideoEntry {
    id: string;
    video_type: string;
    stream_source: string;
    title: string;
    embed_id: string;
    thumbnail_url: string;
    thumbnail_image_name: string;
    company_id: number;
    company_full: string;
    company_logo: string;
    is_featured: boolean;
}

type SortKey = "title" | "company_full" | "stream_source" | "video_type";

export const YouTubeEmbedFieldDescriptions: Record<string, string> = {
    autoplay: "Autoplay video on load",
    mute: "Start video muted",
    controls: "Player controls: 0 = hidden, 1 = visible, 2 = show at start only",
    loop: "Loop video playback",
    startAt: "Start time in seconds",
    endAt: "End time in seconds",
    rel: "Show related videos after playback",
    modestBranding: "Hide YouTube logo",
    fs: "Allow fullscreen button",
    ccLoadPolicy: "Show captions by default",
    ccLangPref: "Preferred caption language",
    ivLoadPolicy: "Annotations: 1 = show, 3 = hide",
    playsInline: "Inline playback on mobile",
    disableKb: "Disable keyboard shortcuts",
    enableJsApi: "Enable iframe JS API",
    origin: "Origin domain for JS API"
};


export default function ManageVideoList() {
    const [videoList, setVideoList] = useState<VideoEntry[]>([]);

    const [editId, setEditId] = useState<string | null>(null);
    const [editedVideo, setEditedVideo] = useState<Partial<VideoEntry> & { image_file?: File; isNewImageUploaded?: boolean }>({
        isNewImageUploaded: false
    });
    const [editCompany, setEditCompany] = useState<Partial<Company>>();
    const [showCompanyOverlay, setShowCompanyOverlay] = useState(false);

    const [sortKey, setSortKey] = useState<SortKey>("company_full");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    // filters
    const [selectedVideoType, setSelectedVideoType] = useState<string>("all");
    const [selectedVideoSource, setSelectedVideoSource] = useState("all");
    const [selectedCompany, setSelectedCompany] = useState("");
    const [selectedTitle, setSelectedTitle] = useState("");


    const [showLoadingScreen, setShowLoadingScreen] = useState<Boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showDeleteFor, setShowDeleteFor] = useState<string | null>(null);

    const [showEmbedSettingsOverlay, setShowEmbedSettingsOverlay] = useState(false);
    const [embedSettings, setEmbedSettings] = useState<Record<string, any>>({
        autoplay: false,
        mute: false,
        controls: 1,
        loop: false,
        startAt: undefined,
        endAt: undefined,
        rel: true,
        modestBranding: false,
        fs: true,
        ccLoadPolicy: false,
        ccLangPref: "",
        ivLoadPolicy: 1,
        playsInline: false,
        disableKb: false,
        enableJsApi: false,
        origin: "",
    });


    const router = useRouter();

    const fetchVideos = async () => {
        setIsRefreshing(true);
        try {
            const res = await axios.get("/api/video");

            const transformed = res.data.map((video: any): VideoEntry => ({
                id: video.id,
                embed_id: video.embed_id,
                title: video.title,
                video_type: video.type,
                stream_source: video.source,
                thumbnail_url: video.thumbnail_url,
                thumbnail_image_name: video.thumbnail_image_name,
                is_featured: video.is_featured,

                company_id: video.company.id,
                company_full: video.company.company_full,
                company_logo: video.company.logo_url || "",
            }));

            setVideoList(transformed);
        } catch {
            toast.error("Failed to load videos");
        } finally {
            setTimeout(() => {
                setIsRefreshing(false);
            }, 1000)
        }
    };

    const handleEdit = (id: string, video: VideoEntry) => {
        setEditId(id);
        setEditedVideo({
            ...video,
            isNewImageUploaded: false,
        });
        setEditCompany({
            id: video.company_id || 0,
            company_full: video.company_full,
            logo_url: video.company_logo,
        });
    };

    const handleDelete = async (id: string) => {
        try {
            const match = videoList.find(video => video.id === id);
            const companyName = match?.company_full || "";
            const video_title = match?.title || "";

            let name = "";

            if (companyName.trim() == "" || video_title.trim() == "") {
                name = "video"
            } else {
                name = `${companyName}(${video_title})`
            }

            await axios.delete("/api/video", { params: { id } });

            toast.success(`${name} deleted`);
            fetchVideos();
            setShowDeleteFor(null);
            setEditId(null);
            setEditedVideo({});
        } catch {
            toast.error("Failed to delete video");
        }
    };

    const handleSave = async () => {
        const ENABLE_PUT_CALL = true;
        setShowLoadingScreen(true);

        if (!editId) return;
        const originalJD = videoList.find((video) => video.id === editId);
        if (!originalJD) return;

        const video_type = editedVideo.video_type || "";
        const video_source = editedVideo.stream_source || "";
        const title = editedVideo.title || "";
        const embed_id = editedVideo.embed_id || "";
        const company_id = String(editCompany?.id || "0");
        const is_featured = String(editedVideo.is_featured || true);

        const formData = new FormData();
        formData.append("is_default", "false");
        formData.append("company_id", company_id);
        formData.append("id", editId);
        formData.append("type", video_type);
        formData.append("source", video_source);
        formData.append("title", title);
        formData.append("embed_id", embed_id);
        formData.append("is_featured", is_featured);
        formData.append("keep_existing_image", editedVideo.isNewImageUploaded ? "false" : "true")

        const image_file = editedVideo.image_file;
        const image_name = editedVideo.thumbnail_image_name;

        if (image_file instanceof File && image_name) {
            formData.append("image", image_file);
            formData.append("image_name", image_name)
        }

        // Debug: Log all form data being sent
        for (const [key, value] of formData.entries()) {
            console.log(`${key}:`, value);
        }

        if (!ENABLE_PUT_CALL) {
            toast("PUT call skipped (debug mode)");
            setEditId(null);
            setEditedVideo({ isNewImageUploaded: false });
            setEditCompany(undefined);
            setShowCompanyOverlay(false);

            return;
        }

        try {
            const res = await axios.put("/api/video/", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            setShowLoadingScreen(false);
            toast.success("Video updated");

            // Cleanup
            setEditId(null);
            setEditedVideo({ isNewImageUploaded: false });
            setEditCompany(undefined);
            setShowCompanyOverlay(false);

            fetchVideos();
        } catch (err) {
            toast.error("Failed to update Video");
        } finally {
            setShowLoadingScreen(false)
        }

        setShowLoadingScreen(false);
        setEditId(null);
        setEditedVideo({});
    };

    const handleCancelEdit = () => {
        setEditId(null);
        setEditedVideo({});
    };

    const ActionButton = ({ icon, label, onClick, color }: { icon: JSX.Element; label: string; onClick: () => void; color: string }) => (
        <button onClick={onClick} className={`flex items-center gap-1 px-3 py-1 ${color} text-white rounded-md text-sm shadow hover:opacity-90 transition`}>
            {icon} {label}
        </button>
    );

    const toggleSort = (key: SortKey) => {
        if (key === sortKey) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortOrder("asc");
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);


    const filteredList = videoList.filter((video) => {
        return (
            (selectedCompany === "" || video.company_full.toLowerCase().includes(selectedCompany.toLowerCase())) &&
            (selectedTitle === "" || video.title.toLowerCase().includes(selectedTitle.toLowerCase())) &&
            (selectedVideoSource === "all" || video.stream_source === selectedVideoSource) &&
            (selectedVideoType === "all" || video.video_type === selectedVideoType)
        );
    });

    if (sortKey) {
        filteredList.sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];
            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });
    }

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

    return (
        <div className="p-6 md:p-8 bg-gray-100 h-full -z-10">
            <div className="sticky top-0 pb-4 z-20">
                <div className="text-sm text-gray-600 flex gap-2 mb-2">
                    <span onClick={() => router.push("/dashboard")} className="cursor-pointer hover:text-cyan-600">Dashboard</span>
                    <span>/</span>
                    <span className="text-gray-900 font-semibold">Manage Videos</span>
                </div>
            </div>

            <motion.h1 layoutScroll className="text-2xl md:text-3xl font-bold text-gray-900" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                Manage Videos
            </motion.h1>

            <div className="mt-4 flex justify-between items-center">
                <div className="flex items-center gap-2">

                    <select
                        value={selectedVideoType}
                        onChange={(e) => setSelectedVideoType(e.target.value)}
                        className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                        <option value="all">All Types</option>
                        {Object.values(VIDEO_REQ).map((video_type, _i) => (
                            <option key={video_type}>{video_type}</option>
                        ))}
                    </select>

                    <motion.input
                        type="text"
                        placeholder="Company"
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        whileFocus={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm text-black bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 shadow-sm focus:shadow-lg transition duration-75 w-64"
                    />

                    <motion.input
                        type="text"
                        placeholder="Title"
                        value={selectedTitle}
                        onChange={(e) => setSelectedTitle(e.target.value)}
                        whileFocus={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm text-black bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 shadow-sm focus:shadow-lg transition duration-75 w-64"
                    />


                    <select
                        value={selectedVideoSource}
                        onChange={(e) => setSelectedVideoSource(e.target.value)}
                        className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                        <option value="all">All Sources</option>
                        {Object.values(VIDEO_STREAM_SOURCE).map((video_source, _i) => (
                            <option key={video_source}>{video_source}</option>
                        ))}
                    </select>


                    <button
                        onClick={fetchVideos}
                        className="p-2 rounded-md border border-gray-300 text-gray-600 hover:text-cyan-600 hover:border-cyan-500 transition shadow-sm hover:shadow-md"
                        title="Refresh"
                    >
                        <motion.div animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }} transition={{ repeat: isRefreshing ? Infinity : 0, repeatType: "loop", ease: "linear", duration: 1 }}>
                            <ArrowPathIcon className="h-5 w-5" />
                        </motion.div>
                    </button>


                </div>

                <div className="flex items-center gap-2 ml-auto">
{/* 
                    <button
                        onClick={() => setShowEmbedSettingsOverlay(true)}
                        className="bg-white text-cyan-700 border border-cyan-400 hover:bg-cyan-50 px-4 py-2 rounded-md text-sm font-medium shadow transition"
                    >
                        ⚙️ Set Embed Settings
                    </button> */}


                    <button
                        onClick={async () => {
                            try {
                                await axios.post("/api/video", {
                                    is_default: true
                                }, {
                                    headers: {
                                        "Content-Type": "application/json"
                                    }
                                });
                                toast.success("added new video")

                                fetchVideos();
                            } catch (err: any) {
                                toast.error(err.data?.error || "couldn't add new video")
                            }
                        }}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow transition"
                    >
                        + Add Video
                    </button>
                </div>
            </div>

            {filteredList.length > 0 && (
                <p className="text-sm text-gray-600 mt-2 ml-1">
                    Showing {filteredList.length} Video{filteredList.length > 1 ? "s" : ""}
                </p>
            )}

            <div className="grid grid-cols-15 gap-3.5 font-semibold text-gray-700 text-sm uppercase tracking-wide mb-2 text-center mt-4">
                <div className="col-span-1 ml-5">Logo</div>

                <div
                    className="col-span-2 cursor-pointer flex justify-center items-center gap-1"
                    onClick={() => toggleSort("company_full")}
                >
                    Company
                    {sortKey === "company_full" && (sortOrder === "asc" ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />)}
                </div>

                <div
                    className="col-span-1 cursor-pointer flex justify-center items-center gap-1"
                    onClick={() => toggleSort("video_type")}
                >
                    Type
                    {sortKey === "video_type" && (sortOrder === "asc" ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />)}
                </div>

                <div className="col-span-1 cursor-pointer flex justify-center items-center gap-1"
                    onClick={() => toggleSort("stream_source")}>
                    Source
                    {sortKey === "stream_source" && (sortOrder === "asc" ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />)}
                </div>

                <div className="col-span-1">Embed ID</div>

                <div className="col-span-4 cursor-pointer flex justify-center items-center gap-1"
                    onClick={() => toggleSort("title")}
                >
                    Title
                    {sortKey === "title" && (sortOrder === "asc" ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />)}
                </div>

                <div className="col-span-1">Thumbnail</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-3">Actions</div>

            </div>

            <AnimatePresence>
                {filteredList.map((video) => (
                    <motion.div key={video.id} className="grid grid-cols-15 gap-3.5 items-center bg-white shadow-sm rounded-md px-6 py-3 mb-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}>

                        {/* Company */}
                        {editId === video.id ? (
                            <div className="col-span-3 text-center">
                                <button
                                    onClick={() => {
                                        setShowCompanyOverlay(true)
                                        setEditedVideo({
                                            ...video,
                                            title: "",
                                            thumbnail_image_name: "",
                                            video_type: "COMPANY"
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
                                    ) : video.company_logo && video.company_full ? (
                                        <>
                                            <Image src={video.company_logo} alt="logo" width={24} height={24} className="rounded" />
                                            <span className="font-medium">{video.company_full}</span>
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
                                    {video.company_logo ? (
                                        <Image src={video.company_logo} alt="logo" width={40} height={40} className="rounded" />
                                    ) : (
                                        <div className="w-10 h-10 bg-gray-200 rounded" />
                                    )}
                                </div>
                                <div className="col-span-2 text-sm text-gray-900 text-left">
                                    {video.company_full || <span className="text-gray-400">N/A</span>}
                                </div>
                            </>
                        )}

                        {/* Type (COMPANY/GENERIC) */}
                        <div className="col-span-1 text-sm text-center text-gray-800">
                            {editId === video.id ? (
                                <select
                                    value={editedVideo.video_type}
                                    onChange={(e) =>
                                        setEditedVideo({ ...editedVideo, video_type: e.target.value })
                                    }
                                    className="w-full px-2 py-1 border rounded text-sm"
                                >
                                    {
                                        Object.keys(VIDEO_REQ).map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))
                                    }
                                </select>
                            ) : (
                                <span className={`font-normal`}>
                                    {video.video_type}
                                </span>
                            )}
                        </div>

                        {/* SOURCE */}
                        <div className="col-span-1 text-sm text-center text-gray-800">
                            {editId === video.id ? (
                                <select
                                    value={editedVideo.stream_source}
                                    onChange={(e) =>
                                        setEditedVideo({ ...editedVideo, stream_source: e.target.value })
                                    }
                                    className="w-full px-2 py-1 border rounded text-sm"
                                >
                                    {
                                        Object.keys(VIDEO_STREAM_SOURCE).map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))
                                    }
                                </select>
                            ) : (
                                <span className={`font-normal`}>
                                    {video.stream_source}
                                </span>
                            )}
                        </div>

                        {/* Embed ID */}
                        <div className="col-span-1 text-sm text-gray-800 text-left">
                            {editId === video.id ? (
                                <input
                                    value={editedVideo.embed_id || ""}
                                    onChange={(e) => setEditedVideo({ ...editedVideo, embed_id: e.target.value })}
                                    className="w-full px-2 py-1 border rounded text-sm"
                                />
                            ) : (
                                <>{video.embed_id}</>
                            )}
                        </div>


                        {/* Title */}
                        <div className="col-span-4 text-sm text-gray-800 text-left font-semibold uppercase">
                            {editId === video.id ? (
                                <input
                                    value={editedVideo.title || ""}
                                    onChange={(e) => setEditedVideo({ ...editedVideo, title: e.target.value })}
                                    className="w-full px-2 py-1 border rounded text-sm"
                                />
                            ) : (
                                <>{highlightMatch(video.title, selectedTitle)}</>
                            )}
                        </div>

                        {/* Image Upload */}
                        <div className="col-span-1 text-xs text-center relative">
                            {editId === video.id ? (
                                <>
                                    <button
                                        onClick={() => {
                                            setShowCompanyOverlay(false);

                                            const input = document.createElement("input");
                                            input.type = "file";
                                            input.accept = ".png,.jpg,.jpeg,.svg";
                                            input.onchange = (e: any) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    toast.success(`Attached ${file.name}`);
                                                    setEditedVideo({
                                                        ...editedVideo,
                                                        image_file: file,
                                                        thumbnail_url: URL.createObjectURL(file),
                                                        thumbnail_image_name: file.name,
                                                        isNewImageUploaded: true,
                                                    });
                                                }
                                            };
                                            input.click();
                                        }}
                                        className="flex flex-col items-center justify-center mx-auto px-2 py-2 border border-dashed border-gray-400 hover:border-cyan-500 text-gray-700 hover:text-cyan-600 rounded transition"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        <span className="text-xs">Upload Image</span>
                                    </button>

                                    {/* Filename (already present or newly selected) */}
                                    {(editedVideo.thumbnail_image_name || video.thumbnail_image_name) && (
                                        <p className="mt-1 text-xs text-gray-600 truncate">
                                            {editedVideo.thumbnail_image_name || video.thumbnail_image_name}
                                        </p>
                                    )}
                                </>
                            ) : (
                                video.thumbnail_url ? (
                                    <Tooltip.Provider delayDuration={150}>
                                        <Tooltip.Root>
                                            <Tooltip.Trigger asChild>
                                                <a
                                                    href={video.thumbnail_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-medium px-3 py-1.5 rounded shadow-sm transition"
                                                >
                                                    <DocumentIcon className="w-5 h-5" />
                                                    <span>Preview Image</span>
                                                </a>
                                            </Tooltip.Trigger>
                                            <Tooltip.Portal>
                                                <Tooltip.Content
                                                    side="top"
                                                    sideOffset={6}
                                                    className="rounded-md bg-gray-900 text-white px-3 py-1 text-xs shadow-md z-50"
                                                >
                                                    {video.thumbnail_image_name}
                                                    <Tooltip.Arrow className="fill-gray-900" />
                                                </Tooltip.Content>
                                            </Tooltip.Portal>
                                        </Tooltip.Root>
                                    </Tooltip.Provider>
                                ) : (
                                    <div className="text-gray-400 flex flex-col items-center gap-1">
                                        <DocumentIcon className="w-5 h-5 text-gray-300" />
                                        <span className="text-xs">No Image attached</span>
                                    </div>
                                ))}
                        </div>

                        {/* Active/InActive */}
                        <div className="col-span-1 text-sm text-center text-gray-800">
                            {editId === video.id ? (
                                <select
                                    value={editedVideo.is_featured ? "Active" : "Inactive"}
                                    onChange={(e) =>
                                        setEditedVideo({ ...editedVideo, is_featured: e.target.value === "Active" })
                                    }
                                    className="w-full px-2 py-1 border rounded text-sm"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            ) : (
                                <span className={`font-semibold ${video.is_featured ? "text-green-600" : "text-red-500"}`}>
                                    {video.is_featured ? "Active" : "Inactive"}
                                </span>
                            )}
                        </div>


                        {/* Actions */}
                        <div className="col-span-3 flex gap-2 flex-wrap justify-center">
                            {editId === video.id ? (
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
                                        onClick={() => handleEdit(video.id, video)}
                                    />
                                    <ActionButton
                                        icon={<TrashIcon className="w-4 h-4" />}
                                        label="Delete"
                                        color="bg-red-500"
                                        onClick={() => handleDelete(video.id)}
                                    />
                                </>
                            )}
                        </div>

                        {showDeleteFor === video.id && (
                            <ConfirmRowOverlay
                                message="Delete this video?"
                                onConfirm={async () => {
                                    await handleDelete(video.id);
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
                    <p className="text-cyan-200 text-lg font-medium animate-pulse">Uploading Video Entry...</p>
                </div>
            )}

            {showEmbedSettingsOverlay && (
                <PortalWrapper>
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm text-gray-900"
                        onClick={() => setShowEmbedSettingsOverlay(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.25 }}
                            className="relative w-full max-w-2xl mx-4 bg-white p-6 rounded-xl shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-semibold mb-4 text-gray-800">YouTube Embed Settings</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {Object.entries(YouTubeEmbedFieldDescriptions).map(([key, desc]) => (
                                    <div key={key}>
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                            {key}
                                            <Tooltip.Provider delayDuration={150}>
                                                <Tooltip.Root>
                                                    <Tooltip.Trigger asChild>
                                                        <span className="text-blue-500 cursor-help">❓</span>
                                                    </Tooltip.Trigger>
                                                    <Tooltip.Portal>
                                                        <Tooltip.Content side="top" className="bg-black text-white px-2 py-1 rounded text-xs max-w-xs shadow">
                                                            {desc}
                                                            <Tooltip.Arrow className="fill-black" />
                                                        </Tooltip.Content>
                                                    </Tooltip.Portal>
                                                </Tooltip.Root>
                                            </Tooltip.Provider>
                                        </label>
                                        <div className="mt-1">
                                            {typeof embedSettings[key] === "boolean" ? (
                                                <input
                                                    type="checkbox"
                                                    checked={embedSettings[key]}
                                                    onChange={(e) => setEmbedSettings({ ...embedSettings, [key]: e.target.checked })}
                                                />
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={embedSettings[key] ?? ""}
                                                    onChange={(e) => setEmbedSettings({ ...embedSettings, [key]: e.target.value })}
                                                    className="w-full px-2 py-1 border rounded text-sm"
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    onClick={() => setShowEmbedSettingsOverlay(false)}
                                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        console.log("Saved embed settings:", embedSettings);
                                        toast.success("Embed settings saved");
                                        setShowEmbedSettingsOverlay(false);
                                    }}
                                    className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700"
                                >
                                    Save Settings
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </PortalWrapper>
            )}


        </div>
    );
}
