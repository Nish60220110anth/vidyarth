import { VideoPaneProps } from "@/types/panes";
import React, { useMemo, useState } from "react";

const EMBED_CONFIG: Record<
    string,
    {
        baseUrl: (id: string) => string;
        allow: string;
        title: string;
        defaultParams: Record<string, string | number>;
    }
> = {
    youtube: {
        baseUrl: (id) =>
            `https://www.youtube.com/embed/${id}?${new URLSearchParams({
                autoplay: "0",
                controls: "1",
                modestbranding: "1",
                rel: "0",
                showinfo: "0",
                playsinline: "1",
            }).toString()}`,
        allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
        title: "YouTube Video",
        defaultParams: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            playsinline: 1,
        },
    },

    vimeo: {
        baseUrl: (id) =>
            `https://player.vimeo.com/video/${id}?${new URLSearchParams({
                title: "0",
                byline: "0",
                portrait: "0",
                autoplay: "0",
                controls: "1",
                loop: "0",
            }).toString()}`,
        allow: "autoplay; fullscreen; picture-in-picture",
        title: "Vimeo Video",
        defaultParams: {
            title: 0,
            byline: 0,
            portrait: 0,
            autoplay: 0,
            controls: 1,
            loop: 0,
        },
    },
};

type VideoItem = NonNullable<VideoPaneProps["props"]["videos"]>[number];

const VideoCard: React.FC<{ video: VideoItem }> = ({ video }) => {
    const platform = (video.source || "").toLowerCase().trim();
    const config = EMBED_CONFIG[platform];

    // If we don't support this platform or there's no embed id, skip rendering
    if (!config || !video.embed_id) return null;

    const [showIframe, setShowIframe] = useState(false);
    const iframeSrc = useMemo(() => {
        if (!video.embed_id) return "";
        const url = new URL(config.baseUrl(video.embed_id));
        if (showIframe) url.searchParams.set("autoplay", "1");
        return url.toString();
    }, [config, showIframe, video.embed_id]);

    const thumbnail =
        (video.thumbnail_url || "").trim() ||
        (platform === "youtube" && video.embed_id
            ? `https://img.youtube.com/vi/${video.embed_id}/hqdefault.jpg`
            : "");

    const handlePlay = () => {
        if (!video.embed_id) return;
        setShowIframe(true);
    };

    return (
        <div className="bg-white dark:bg-[#1a1f2b] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300">
            <div
                className="aspect-video w-full relative cursor-pointer group"
                onClick={handlePlay}
                role="button"
                aria-label={`Play ${video.title || config.title}`}
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handlePlay();
                    }
                }}
            >
                {!showIframe ? (
                    <>
                        {thumbnail ? (
                            <img
                                src={thumbnail}
                                alt={video.title || "Video thumbnail"}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-200 dark:bg-gray-800" />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/60 transition">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-12 h-12 text-white group-hover:scale-110 transition-transform"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </>
                ) : (
                    <iframe
                        src={iframeSrc}
                        title={video.title || config.title}
                        allow={config.allow}
                        allowFullScreen
                        className="w-full h-full border-0"
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                    />
                )}
            </div>

            <div className="p-4 space-y-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate uppercase">
                    {video.title || "Untitled Video"}
                </p>
                <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-600">
                    {video.source || "Unknown Source"}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Last updated:{" "}
                    {video.updated_at
                        ? new Date(video.updated_at).toLocaleDateString()
                        : "Unknown"}
                </p>
            </div>
        </div>
    );
};

const VideoPane: React.FC<VideoPaneProps> = ({ props }) => {
    const videos = props.videos || [];

    if (!videos.length) {
        return (
            <div className="flex flex-col items-center justify-center text-center text-cyan-300 p-10 rounded-xl border border-blue-900 bg-gradient-to-b from-[#0d1b24] to-[#0a141d] shadow-[0_0_20px_rgba(0,255,255,0.1)] backdrop-blur-sm">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#112531] border border-blue-800 mb-4 p-2 shadow-inner">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-10 h-10 text-cyan-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-9A2.25 2.25 0 002.25 5.25v13.5A2.25 2.25 0 004.5 21h9a2.25 2.25 0 002.25-2.25V15m4.5-6.75v0m0 0a2.25 2.25 0 110 4.5 2.25 2.25 0 010-4.5zM21 9.75L16.5 12v-4.5L21 9.75z"
                        />
                    </svg>
                </div>

                <p className="text-base font-semibold text-cyan-100">No videos available</p>
                <p className="text-sm text-gray-400 mt-1">
                    Videos related to this section haven’t been uploaded or approved yet.
                </p>
                <p className="text-sm text-gray-400">Please check back later or try refreshing.</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((video, idx) => (
                    <VideoCard key={`${video.embed_id || "noid"}-${idx}`} video={video} />
                ))}
            </div>
        </div>
    );
};

export default VideoPane;
