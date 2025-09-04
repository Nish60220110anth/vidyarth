// hooks/useDropdownMenuHandlers.ts
import { JSX, useEffect } from "react";
import { useRouter } from "next/router";
import { ACCESS_PERMISSION } from "@prisma/client";
type Refs = {
    profileMenuRef: React.RefObject<HTMLElement | null>;
    announcementRef: React.RefObject<HTMLElement | null>;
};

type Args = {
    setActiveComponent: (component: JSX.Element) => void;
    showProfileMenu: boolean;
    setShowProfileMenu: (val: boolean) => void;
    showAnnouncements: boolean;
    setShowAnnouncements: (val: boolean) => void;
    profile_dropdown_items: Record<
        string,
        {
            label: string;
            perm: ACCESS_PERMISSION;
            icon: (cls: string) => JSX.Element;
            component: () => JSX.Element;
        }
    >;
    permissions: Record<string, boolean>;
    highlightedIndex: number | null;
    setHighlightedIndex: (val: number | null | ((prev: number | null) => number | null)) => void;
};

export function useDropdownMenuHandlers(
    {
        profileMenuRef,
        announcementRef,
    }: Refs,
    {
        setActiveComponent,
        showProfileMenu,
        setShowProfileMenu,
        showAnnouncements,
        setShowAnnouncements,
        profile_dropdown_items,
        permissions,
        highlightedIndex,
        setHighlightedIndex,
    }: Args
) {
    const router = useRouter();

    useEffect(() => {
        const handleGlobalClick = (e: MouseEvent) => {
            if (
                profileMenuRef.current &&
                !profileMenuRef.current.contains(e.target as Node)
            ) {
                setShowProfileMenu(false);
            }

            if (
                announcementRef.current &&
                !announcementRef.current.contains(e.target as Node)
            ) {
                setShowAnnouncements(false);
            }
        };

        document.addEventListener("mousedown", handleGlobalClick);
        return () => {
            document.removeEventListener("mousedown", handleGlobalClick);
        };
    }, [profileMenuRef, announcementRef]);

    useEffect(() => {
        if (!showProfileMenu) return;

        const handleKeyDown = async (e: KeyboardEvent) => {
            const items = Object.entries(profile_dropdown_items).filter(
                ([_, item]) => permissions[item.perm]
            );
            if (items.length === 0) return;

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setHighlightedIndex((prev) =>
                        prev === null || prev === items.length - 1 ? 0 : prev + 1
                    );
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setHighlightedIndex((prev) =>
                        prev === null || prev === 0 ? items.length - 1 : prev - 1
                    );
                    break;
                case "Enter":
                    e.preventDefault();
                    if (highlightedIndex !== null) {
                        const [, item] = items[highlightedIndex];
        
                        setActiveComponent(item.component());
                        setShowProfileMenu(false);
                    }
                    break;
                case "Escape":
                    e.preventDefault();
                    setShowProfileMenu(false);
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [
        showProfileMenu,
        highlightedIndex,
        permissions,
        profile_dropdown_items,
        router,
        setHighlightedIndex,
        setShowProfileMenu,
    ]);
}
