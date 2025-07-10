import { JSX, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import axios from "axios";
import {
    CheckCircleIcon,
    XCircleIcon,
    PencilIcon,
    TrashIcon,
    PowerIcon,
    BuildingLibraryIcon,
    RocketLaunchIcon,
    ArrowsRightLeftIcon,
    UserGroupIcon,
    ScaleIcon,
    CurrencyDollarIcon,
    CpuChipIcon,
    SparklesIcon,
    WrenchScrewdriverIcon,
    CheckIcon,
    XMarkIcon,
    ArrowUpTrayIcon,
    MegaphoneIcon,
    GlobeAltIcon,
    ClipboardDocumentCheckIcon,
    AcademicCapIcon,
    QuestionMarkCircleIcon,
} from "@heroicons/react/24/solid";


import { PlusIcon } from "@heroicons/react/24/solid";
import CompanySearchDropdown from "./CompanySearchDropDown";
import PortalWrapper from "./PortableWrapper";
import { ALL_DOMAINS } from "./ManageCompanyList";
import { ACCESS_PERMISSION, NEWS_SUBDOMAIN_TAG } from "@prisma/client";

const TAG_STYLES: Record<string, { icon: JSX.Element; color: string }> = {
    BUSINESS_ECONOMY: { icon: <ScaleIcon className="w-4 h-4" />, color: "text-gray-800" },
    FINANCE_MARKETS: { icon: <CurrencyDollarIcon className="w-4 h-4" />, color: "text-green-700" },
    TECHNOLOGY_INNOVATION: { icon: <CpuChipIcon className="w-4 h-4" />, color: "text-indigo-600" },
    STARTUPS_ENTREPRENEURSHIP: { icon: <RocketLaunchIcon className="w-4 h-4" />, color: "text-purple-600" },
    CONSULTING_STRATEGY: { icon: <SparklesIcon className="w-4 h-4" />, color: "text-yellow-700" },
    MARKETING_ADVERTISING: { icon: <MegaphoneIcon className="w-4 h-4" />, color: "text-pink-600" },
    PRODUCT_MANAGEMENT_DESIGN: { icon: <WrenchScrewdriverIcon className="w-4 h-4" />, color: "text-blue-700" },
    OPERATIONS_SUPPLY_CHAIN: { icon: <ArrowsRightLeftIcon className="w-4 h-4" />, color: "text-cyan-700" },
    HUMAN_RESOURCES_CAREERS: { icon: <UserGroupIcon className="w-4 h-4" />, color: "text-red-600" },
    GENERAL_MANAGEMENT_LEADERSHIP: { icon: <BuildingLibraryIcon className="w-4 h-4" />, color: "text-teal-700" },
    GOVERNMENT_POLICY: { icon: <ScaleIcon className="w-4 h-4" />, color: "text-gray-700" },
    INTERNATIONAL_AFFAIRS: { icon: <GlobeAltIcon className="w-4 h-4" />, color: "text-blue-600" },
    ENVIRONMENT_SUSTAINABILITY: { icon: <span className="text-green-600 text-lg">🍃</span>, color: "text-green-600" },
    LEGAL_COMPLIANCE: { icon: <ClipboardDocumentCheckIcon className="w-4 h-4" />, color: "text-amber-700" },
    EDUCATION_RESEARCH: { icon: <AcademicCapIcon className="w-4 h-4" />, color: "text-indigo-700" },
    OTHER: { icon: <QuestionMarkCircleIcon className="w-4 h-4" />, color: "text-gray-500" }
};


export default function NewsCard({ news, fetchNews, search,
    is_read = false
}: {
    news: any; fetchNews: () => void; search?: string,
    is_read: boolean,
}) {

    const [expanded, setExpanded] = useState(false);
    const [editMode, setEditMode] = useState(false);

    const [title, setTitle] = useState(news.title);
    const [content, setContent] = useState(news.content);
    const [domainTag, setDomainTag] = useState(news.news_tag || "OTHER");
    const [subdomainTag, setSubdomainTag] = useState(news.subdomain_tag || "OTHER");
    const [isActive, setIsActive] = useState(news.is_active);
    const [isApproved, setIsApproved] = useState(news.is_approved);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(news.image_url);
    const [imageFormData, setImageFormData] = useState<FormData | null>();
    const [isUploading, setIsUploading] = useState<boolean>(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [companyList, setCompanyList] = useState(news.companies ?? []);
    const [domainList, setDomainList] = useState(news.domains?.map((d: any) => d.domain) ?? []);
    const [showOverlay, setShowOverlay] = useState(false);
    const [link, setLink] = useState(news.link_to_source || "");

    useEffect(() => {
        if (is_read) {
            setEditMode(false);
        }
    }, [is_read, editMode]);


    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setShowOverlay(false);
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, []);

    const highlightMatch = (text: string, query: string) => {
        if (!query) return text;

        const regex = new RegExp(`(${query})`, "gi");
        const parts = text.split(regex);

        return parts.map((part, index) =>
            part.toLowerCase() === query.toLowerCase() ? (
                <span
                    key={index}
                    className="font-bold text-yellow-400 animate-highlight"
                    style={{ padding: 0, margin: 0 }}
                >
                    {part}
                </span>
            ) : (
                part
            )
        );
    };

    const handleCancel = () => {
        setEditMode(false);
        setTitle(news.title);
        setContent(news.content);
        setCompanyList(news.companies ?? []);
        setDomainList(news.domains?.map((d: any) => d.domain) ?? []);
        setLink(news.link_to_source || "");
        setDomainTag(news.news_tag || "OTHER");
        setSubdomainTag(news.subdomain_tag || "OTHER");
        setImageFormData(null);
        setPreviewImageUrl(news.image_url || null);
    }

    useEffect(() => {
        if (editMode) {

            if (!imageFormData && news.image_url) {
                setPreviewImageUrl(`${news.image_url}`);
            }
        } else {
            setPreviewImageUrl(null);
        }

        setImageFormData
    }, [editMode]);


    const handleSave = async () => {
        try {

            setIsUploading(true);
            await axios.put("/api/news", {
                id: news.id,
                title,
                content,
                is_active: isActive,
                is_approved: isApproved,
                newsTag: domainTag,
                subdomainTag,
                domains: domainList,
                companies: companyList.map((c: any) => c.company.id),
                link_to_source: link.trim(),
            }, {
                headers: {
                    "Content-Type": "application/json",
                    "x-access-permission": ACCESS_PERMISSION.MANAGE_NEWS
                },
            });

            if (imageFormData) {
                await axios.post("/api/news/upload-image", imageFormData, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                        "x-access-permission": ACCESS_PERMISSION.MANAGE_NEWS
                    },
                });
                setImageFormData(null);
            }

            setEditMode(false);
            fetchNews();
        } catch {
            toast.error("Update failed");
        } finally {
            setIsUploading(false);
        }
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    useEffect(() => {
        if (!imageFormData) {
            setPreviewImageUrl(null);
            return;
        }

        const file = imageFormData.get("file") as File;
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewImageUrl(url);

            return () => {
                URL.revokeObjectURL(url);
            };
        }
    }, [imageFormData]);


    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className={`bg-white rounded-xl p-4 border border-gray-200 flex flex-col gap-4 w-full max-w-3xl cursor-pointer transition-transform ${!news.is_active
                    ? "opacity-50 grayscale"
                    : "hover:shadow-lg hover:ring-1 hover:ring-cyan-400 hover:scale-[1.01]"
                    }`}
            >
                {/* Company tags */}
                {(companyList?.length > 0 || editMode) && (
                    <div className="flex flex-wrap gap-2 text-sm text-gray-700 font-medium">
                        {companyList.map((c: any, index: number) => (
                            <span key={c.company.id || index} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded">
                                {c.company.company_name}
                                {!is_read && editMode && (
                                    <XMarkIcon
                                        className="w-4 h-4 text-red-500 cursor-pointer hover:text-red-700"
                                        onClick={() => {
                                            const updated = [...companyList];
                                            updated.splice(index, 1);
                                            setCompanyList(updated);
                                        }}
                                    />
                                )}
                            </span>
                        ))}

                        {!is_read && editMode && (
                            <button onClick={() => setShowOverlay(true)} className="text-cyan-600 hover:text-cyan-800">
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        )}

                        <AnimatePresence>
                            {showOverlay && (
                                <PortalWrapper>
                                    <div
                                        className="fixed inset-0 z-50 flex items-center justify-center bg-white/10 backdrop-blur-sm text-gray-900"
                                        onClick={() => setShowOverlay(false)}
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
                                                        if (!companyList.some((c: any) => c.company.id === company.id)) {
                                                            setCompanyList([...companyList, { company }]);
                                                        } else {
                                                            toast.error("Company already added");
                                                        }
                                                        setShowOverlay(false);
                                                    }}
                                                    permission={ACCESS_PERMISSION.MANAGE_NEWS}
                                                />
                                            </div>
                                        </motion.div>
                                    </div>
                                </PortalWrapper>
                            )}
                        </AnimatePresence>

                    </div>
                )}


                {/* Domains */}
                {(editMode ? (
                    <div className="flex flex-wrap gap-2">
                        {ALL_DOMAINS.map((domain) => (
                            <button
                                key={domain}
                                onClick={() =>
                                    setDomainList((prev: string[]) =>
                                        prev.includes(domain)
                                            ? prev.filter((d) => d !== domain)
                                            : [...prev, domain]
                                    )
                                }
                                className={`px-3 py-1 rounded-full border text-xs font-medium transition ${domainList.includes(domain)
                                    ? "bg-cyan-600 text-white"
                                    : "bg-gray-200 text-gray-700"
                                    }`}
                            >
                                {domain}
                            </button>
                        ))}
                    </div>
                ) : (
                    news.domains?.length > 0 && (
                        <div className="flex flex-wrap gap-2 text-xs text-cyan-800">
                            {news.domains.map((d: any) => (
                                <span key={d.domain} className="px-2 py-0.5 bg-cyan-100 rounded-full font-medium">
                                    {d.domain}
                                </span>
                            ))}
                        </div>
                    )
                ))}

                {/* News Tag */}
                {editMode ? (
                    <select
                        value={domainTag}
                        onChange={(e) => setDomainTag(e.target.value)}
                        className="text-sm border rounded px-2 py-1 bg-white text-gray-900"
                    >
                        {Object.keys(TAG_STYLES).map((tag) => (
                            <option key={tag} value={tag}>
                                {tag.replace(/_/g, " ")}
                            </option>
                        ))}
                    </select>
                ) : (
                    news.news_tag &&
                    TAG_STYLES[news.news_tag] && (
                        <div className={`flex items-center gap-2 text-sm font-semibold ${TAG_STYLES[news.news_tag].color} bg-gray-50 px-2 py-1 rounded`}>
                            {TAG_STYLES[news.news_tag].icon}
                            {news.news_tag.replace(/_/g, " ")}
                        </div>
                    )
                )}

                {/* SubDomain Tag */}
                {editMode ? (
                    <select
                        value={subdomainTag}
                        onChange={(e) => setSubdomainTag(e.target.value)}
                        className="text-sm border rounded px-2 py-1 bg-white text-gray-900"
                    >
                        {Object.keys(NEWS_SUBDOMAIN_TAG).map((tag) => (
                            <option key={tag} value={tag}>
                                {tag.replace(/_/g, " ")}
                            </option>
                        ))}
                    </select>
                ) : (
                    news.subdomain_tag && (
                        <div className={`flex items-center gap-2 text-sm font-semibold bg-gray-50 px-2 py-1 rounded text-gray-800`}>
                            {news.subdomain_tag.replace(/_/g, " ")}
                        </div>
                    )
                )}


                {/* Image */}
                {news.image_url && (
                    <div className="relative w-full max-h-60 rounded-md overflow-hidden">
                        {/* Clickable wrapper */}
                        <div
                            className={`${link.trim() ? "cursor-pointer" : "cursor-default"}`}
                            onClick={() => {
                                if (link.trim()) {
                                    const cleaned = link.trim();
                                    const finalUrl = cleaned.startsWith("https") ? cleaned : `https://${cleaned}`;
                                    window.open(finalUrl, "_blank");
                                }
                            }}
                        >
                            <img
                                src={previewImageUrl || news.image_url}
                                alt="News Visual"
                                className={`w-full h-full object-cover transition-opacity duration-300 ${editMode ? "opacity-50" : "opacity-100"}`}
                            />
                        </div>

                        {editMode && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <label
                                    htmlFor={`news-image-upload-${news.id}`}
                                    className="cursor-pointer bg-cyan-700 hover:bg-cyan-800 text-white px-4 py-2 rounded-md shadow-md flex items-center gap-2 transition"
                                >
                                    <ArrowUpTrayIcon className="w-5 h-5" />
                                    Upload
                                </label>
                                <input
                                    id={`news-image-upload-${news.id}`}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        const formData = new FormData();
                                        formData.append("file", file);
                                        formData.append("id", news.id);

                                        setImageFormData(formData);
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}

                <hr className="border-gray-200" />

                {editMode && (
                    <input
                        type="text"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder="Enter link to news source (optional)"
                        className="mt-2 w-full text-sm px-3 py-2 border border-gray-300 rounded-md text-gray-800 focus:ring-2 focus:ring-cyan-400"
                    />
                )}


                {/* Title */}
                {editMode ? (
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-xl font-bold text-gray-900 border-b border-gray-300 focus:outline-none"
                    />
                ) : (
                    <h2 className="text-xl font-bold text-gray-900 uppercase line-clamp-2">
                        {highlightMatch(title, search || "")}
                    </h2>
                )}

                {/* Content */}
                {editMode ? (
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={3}
                        className="text-sm text-gray-700 border border-gray-300 rounded-md px-2 py-1 resize-none"
                    />
                ) : (
                    <div className="text-sm text-gray-600">

                        <p className={`${expanded ? "line-clamp-none" : "line-clamp-3"}`}>
                            {highlightMatch(content, search || "")}
                        </p>

                        <div className="flex justify-end">
                            {content.length > 120 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setExpanded(!expanded);
                                    }}
                                    className="text-xs text-cyan-600 mt-1 hover:underline"
                                >
                                    {expanded ? "Show Less" : "Read More"}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Verified + Author */}
                <div className="flex justify-between items-start text-sm mt-2 border-t pt-2 border-gray-200">
                    <div className="flex-1">
                        {
                            !is_read && (
                                editMode ? (
                                    <select
                                        value={isApproved ? "true" : "false"}
                                        onChange={(e) => setIsApproved(e.target.value === "true")}
                                        className="text-sm border rounded px-2 py-1 bg-white text-gray-900"
                                    >
                                        <option value="true">Verified</option>
                                        <option value="false">Not Verified</option>
                                    </select>
                                ) : (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${news.is_approved ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                                        {news.is_approved ? <CheckCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />}
                                        {news.is_approved ? "Verified" : "Not Verified"}
                                    </span>
                                ))
                        }
                    </div>

                    <div className="flex flex-col items-end text-right">
                        {news.author?.name && (
                            <span className="text-gray-600 font-medium italic">By {news.author.name}</span>
                        )}
                        {news.created_at && (
                            <span className="text-gray-500 text-xs italic">
                                {formatDate(news.created_at)}
                            </span>
                        )}
                    </div>

                </div>

                {/* Controls */}
                {
                    !is_read && (
                        <div className="flex flex-wrap justify-between items-center mt-3 border-t pt-3 border-gray-200 gap-2">

                            {editMode ? (
                                <select
                                    value={isActive ? "true" : "false"}
                                    onChange={(e) => setIsActive(e.target.value === "true")}
                                    className="border px-2 py-1 rounded text-sm text-gray-900"
                                >
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            ) : (
                                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium ${news.is_active ? "bg-green-50 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                                    <PowerIcon className="w-4 h-4" />
                                    {news.is_active ? "Active" : "Inactive"}
                                </span>
                            )}

                            <div className="flex gap-2">
                                {editMode ? (
                                    <>
                                        <button
                                            onClick={handleSave}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md text-sm shadow hover:bg-green-700 transition"
                                        >
                                            <CheckIcon className="w-4 h-4" /> Save
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-400 text-white rounded-md text-sm shadow hover:bg-gray-500 transition"
                                        >
                                            <XMarkIcon className="w-4 h-4" /> Cancel
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setEditMode(true)}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 text-white rounded-md text-sm shadow hover:bg-cyan-700 transition"
                                        >
                                            <PencilIcon className="w-4 h-4" /> Edit
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-md text-sm shadow hover:bg-red-600 transition"
                                        >
                                            <TrashIcon className="w-4 h-4" /> Delete
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )
                }


                {!is_read && showDeleteConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center space-y-4"
                        >
                            <p className="text-gray-800 text-lg font-medium">Are you sure you want to delete this news?</p>

                            <div className="flex justify-center gap-4 mt-4">
                                <button
                                    onClick={async () => {
                                        try {
                                            await axios.delete("/api/news", {
                                                params: { id: news.id }, headers: {
                                                    "x-access-permission": ACCESS_PERMISSION.MANAGE_NEWS
                                                }
                                            });
                                            toast.success("News deleted");
                                            fetchNews();
                                            setShowDeleteConfirm(false);
                                        } catch {
                                            toast.error("Delete failed");
                                            setShowDeleteConfirm(false);
                                        }
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                    Yes, Delete
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

            </motion.div>

            {
                isUploading && (
                    <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
                        <div className="h-16 w-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(0,255,255,0.6)] mb-4" />
                        <p className="text-cyan-200 text-base sm:text-lg font-medium animate-pulse px-4 text-center">News Uploading ...</p>
                    </div>
                )
            }
        </>
    );
}
