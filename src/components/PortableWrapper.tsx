// components/PortalWrapper.tsx
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function PortalWrapper({ children }: { children: React.ReactNode }) {
    const ref = useRef<Element | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        ref.current = document.body;
        setMounted(true);
    }, []);

    return mounted && ref.current ? createPortal(children, ref.current) : null;
}
