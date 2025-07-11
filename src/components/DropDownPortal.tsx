// components/DropdownPortal.tsx
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export default function DropdownPortal({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const el = document.getElementById("dropdown-root");
    return el ? createPortal(children, el) : null;
}
