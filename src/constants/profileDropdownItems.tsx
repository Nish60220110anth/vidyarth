// constants/profileDropdownItems.ts
import { User, ClipboardCheck, FileText, Megaphone, Settings } from 'lucide-react';
import { ACCESS_PERMISSION } from "@prisma/client";

import Profile from "@/components/Profile";
import Shortlists from "@/components/Shortlists";
import MyCV from "@/components/MyCV";
import Announcements from "@/components/Announcements";
import Preferences from "@/components/Preferences";
import { JSX } from "react";

type ProfileDropdownItem = {
    label: string;
    icon: (cls: string) => JSX.Element;
    perm: ACCESS_PERMISSION;
    component: () => JSX.Element;
    show: boolean;
};

type Args = {
    name: string;
    email: string;
    role: string;
    id: number;
};

export function getProfileDropdownItems({
    name,
    email,
    role,
    id,
}: Args): Record<string, ProfileDropdownItem> {
    const items: Record<string, ProfileDropdownItem> = {
        PROFILE: {
            label: "Profile",
            icon: (cls) => <User className={cls} />,
            perm: ACCESS_PERMISSION.ENABLE_PROFILE,
            component: () => <Profile />,
            show: true,
        },
        SHORTLISTS: {
            label: "Shortlists",
            icon: (cls) => <ClipboardCheck className={cls} />,
            perm: ACCESS_PERMISSION.ENABLE_MY_SECTION,
            component: () => <Shortlists />,
            show: true,
        },
        MY_CV: {
            label: "My CV",
            icon: (cls) => <FileText className={cls} />,
            perm: ACCESS_PERMISSION.ENABLE_MY_CV,
            component: () => <MyCV name={name} email={email} role={role} id={id} />,
            show: true,
        },
        ANNOUNCEMENTS: {
            label: "Announcements",
            icon: (cls) => <Megaphone className={cls} />,
            perm: ACCESS_PERMISSION.ENABLE_ANNOUNCEMENTS,
            component: () => <Announcements id={id}/>,
            show: true,
        },
        PREFERENCES: {
            label: "Preferences",
            icon: (cls) => <Settings className={cls} />,
            perm: ACCESS_PERMISSION.ENABLE_PREFERENCES,
            component: () => <Preferences />,
            show: false,
        },
    };

    return Object.fromEntries(
        Object.entries(items).filter(([, item]) => item.show)
    );
}
