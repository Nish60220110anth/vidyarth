import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { baseUrl as defaultBaseUrl } from "@/lib/config";
import axios from "axios";
import { ACCESS_PERMISSION } from "@prisma/client";

const logoCache = new Map<number, string>();
const inflight = new Map<number, Promise<string | undefined>>();

async function fetchCompanyLogo(companyId: number, baseUrl?: string): Promise<string | undefined> {
    if (logoCache.has(companyId)) return logoCache.get(companyId)!;
    if (inflight.has(companyId)) return inflight.get(companyId)!;

    const p = (async () => {
        const url = baseUrl ? `${baseUrl}/api/company/get-logo?cid=${companyId}` : `/api/company/get-logo?cid=${companyId}`;
        const res = await axios.get(url, {
            headers: { "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY },
        });
        if (!res.data?.success) return undefined;
        const logo = res.data?.logo_url;
        if (typeof logo === "string" && logo.length) {
            logoCache.set(companyId, logo);
            return logo;
        }
        return undefined;
    })().finally(() => {
        inflight.delete(companyId);
    });

    inflight.set(companyId, p);
    return p;
}

const DEFAULT_TAG_IMAGE_MAP: Record<string, string> = {};

type SmartImageProps = {
    src?: string | null;
    alt?: string;
    className?: string;
    style?: React.CSSProperties;
    sizes?: string;
    baseUrl?: string;
    tagImageMap?: Record<string, string>;
    companyId?: number;
    newsTag?: string;
};

export function SmartImage({
    src,
    alt,
    className,
    style,
    sizes,
    baseUrl,
    tagImageMap,
    companyId,
    newsTag,
}: SmartImageProps) {
    const resolvedBaseUrl = useMemo(() => baseUrl ?? defaultBaseUrl ?? undefined, [baseUrl]);

    const resolvedTagImageMap = useMemo(() => {
        const out: Record<string, string> = {};
        const srcMap = tagImageMap ?? DEFAULT_TAG_IMAGE_MAP;
        for (const [k, v] of Object.entries(srcMap)) out[k.toUpperCase()] = v;
        return out;
    }, [tagImageMap]);

    const getTagImage = useCallback(
        (tag?: string) => {
            if (!tag) return undefined;
            return resolvedTagImageMap[tag.toUpperCase()];
        },
        [resolvedTagImageMap]
    );

    const [imgSrc, setImgSrc] = useState<string | undefined>(src ?? undefined);

    const triedCompanyRef = useRef(false);
    const triedTagRef = useRef(false);

    // Establish initial source & proactive fallbacks when src is missing
    useEffect(() => {
        triedCompanyRef.current = false;
        triedTagRef.current = false;

        const tagFallback = getTagImage(newsTag);

        // If an explicit src is provided, start with it and wait for onError to handle fallbacks.
        if (src) {
            setImgSrc(src);
            return;
        }

        // No src: try companyId immediately, then tag fallback.
        let cancelled = false;
        (async () => {
            if (companyId) {
                triedCompanyRef.current = true;
                const fb = await fetchCompanyLogo(companyId, resolvedBaseUrl);
                if (cancelled) return;
                if (fb) {
                    setImgSrc(fb);
                    return;
                }
            }
            if (tagFallback) {
                triedTagRef.current = true;
                setImgSrc(tagFallback);
                return;
            }
            setImgSrc(undefined);
        })();

        return () => {
            cancelled = true;
        };
    }, [src, companyId, newsTag, resolvedBaseUrl, getTagImage]);

    const handleError = useCallback(async () => {
        const tagFallback = getTagImage(newsTag);

        // Try company logo next, if not already tried
        if (companyId && !triedCompanyRef.current) {
            triedCompanyRef.current = true;
            const fb = await fetchCompanyLogo(companyId, resolvedBaseUrl);
            if (fb) {
                setImgSrc(fb);
                return;
            }
        }

        // Then try tag fallback, if not already tried
        if (tagFallback && !triedTagRef.current) {
            triedTagRef.current = true;
            setImgSrc(tagFallback);
            return;
        }

        // Nothing left
        setImgSrc(undefined);
    }, [companyId, newsTag, resolvedBaseUrl, getTagImage]);

    return imgSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={imgSrc}
            alt={alt ?? ""}
            className={className}
            style={{ width: "100%", height: "100%", objectFit: "cover", ...style }}
            onError={handleError}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            sizes={sizes}
        />
    ) : (
        <div className="flex items-center justify-center text-[11px] text-cyan-300/70 w-full h-full bg-[#0a2230]">No Image</div>
    );
}
