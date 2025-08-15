import Link from "next/link";
import { useRouter } from "next/router";

type Variant = {
    title: string;
    subtitle: string;
    action?: { label: string; href?: string; onClick?: () => void };
    secondary?: { label: string; href?: string; onClick?: () => void };
};

const VARIANTS: Record<string, Variant> = {
    "401": { title: "Sign-in required", subtitle: "You need to be authenticated to view this page.", action: { label: "Go to login", href: "/" } },
    "403": { title: "Access denied", subtitle: "You don’t have permission to view this page.", action: { label: "Go home", href: "/" } },
    "404": { title: "Page not found", subtitle: "We couldn’t find what you were looking for.", action: { label: "Go home", href: "/" } },
    "429": { title: "Slow down", subtitle: "Too many requests. Please try again shortly.", action: { label: "Retry" } },
    "500": { title: "Something went wrong", subtitle: "An unexpected error occurred. We’re on it.", action: { label: "Retry" }, secondary: { label: "Go home", href: "/" } },
    "503": { title: "Temporarily unavailable", subtitle: "The service is down for maintenance. Please try later.", action: { label: "Retry" }, secondary: { label: "Status page", href: "/" } },
    default: { title: "Oops!", subtitle: "An error occurred. Please try again.", action: { label: "Retry" }, secondary: { label: "Go home", href: "/" } },
};

export default function ErrorView({ code, message }: { code?: number; message?: string }) {
    const key = String(code ?? "");
    const variant = VARIANTS[key] ?? VARIANTS.default;
    const router = useRouter();

    const Primary = () => {
        if (!variant.action) return null;
        const onRetry = () => router.reload();
        if (variant.action.onClick || variant.action.href === undefined) {
            return (
                <button
                    onClick={variant.action.onClick ?? onRetry}
                    className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#0a141d] font-medium transition"
                >
                    {variant.action.label}
                </button>
            );
        }
        return (
            <Link href={variant.action.href} className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#0a141d] font-medium transition">
                {variant.action.label}
            </Link>
        );
    };

    const Secondary = () => {
        if (!variant.secondary) return null;
        if (variant.secondary.onClick || variant.secondary.href === undefined) {
            return (
                <button
                    onClick={variant.secondary.onClick}
                    className="px-4 py-2 rounded-xl border border-cyan-800 text-cyan-200 hover:bg-[#0f1720] transition"
                >
                    {variant.secondary.label}
                </button>
            );
        }
        return (
            <Link href={variant.secondary.href} className="px-4 py-2 rounded-xl border border-cyan-800 text-cyan-200 hover:bg-[#0f1720] transition">
                {variant.secondary.label}
            </Link>
        );
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d1b24] to-[#0a141d] text-cyan-100">
            <div className="w-full max-w-md rounded-2xl border border-cyan-900 bg-[#0c0f11]/95 p-6 shadow-[0_0_24px_rgba(0,255,255,0.12)]">
                <div className="text-sm text-cyan-400/80 mb-1">{code ?? "Error"}</div>
                <h1 className="text-2xl font-semibold text-cyan-300 mb-2">{variant.title}</h1>
                <p className="text-cyan-200/80 text-sm mb-4">{message || variant.subtitle}</p>
                <div className="flex gap-3">
                    <Primary />
                    <Secondary />
                </div>
            </div>
        </div>
    );
}
