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
        // Prefer absolute if baseUrl is provided; otherwise use relative path
        const url =
            baseUrl
                ? `${baseUrl}/api/company/get-logo?cid=${companyId}`
                : `/api/company/get-logo?cid=${companyId}`;

        const res = await axios.get(url, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
            }
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

export function SmartImage({
    src,
    alt,
    className,
    style,
    companyId,
    sizes,        // only useful if you add srcSet later; safe to keep here
    baseUrl,      // optional override; defaults to config baseUrl or relative path
}: {
    src?: string | null;
    alt?: string;
    className?: string;
    style?: React.CSSProperties;
    companyId: number;
    sizes?: string;
    baseUrl?: string;
}) {
    const [imgSrc, setImgSrc] = useState<string | undefined>(src ?? undefined);
    const triedFallbackRef = useRef(false);

    // Stable resolved baseUrl once
    const resolvedBaseUrl = useMemo(() => baseUrl ?? defaultBaseUrl ?? undefined, [baseUrl]);

    // Reset when src/company changes
    useEffect(() => {
        setImgSrc(src ?? undefined);
        triedFallbackRef.current = false;
    }, [src, companyId]);

    const handleError = useCallback(async () => {
        if (triedFallbackRef.current) {
            // already tried fallback; stop looping
            setImgSrc(undefined);
            return;
        }
        triedFallbackRef.current = true;

        const fb = await fetchCompanyLogo(companyId, resolvedBaseUrl);
        if (fb) setImgSrc(fb);
        else setImgSrc(undefined);
    }, [companyId, resolvedBaseUrl]);

    // eslint-disable-next-line @next/next/no-img-element
    return imgSrc ? (
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
        <div className="flex items-center justify-center text-[11px] text-cyan-300/70 w-full h-full bg-[#0a2230]">
            No Image
        </div>
    );
}
