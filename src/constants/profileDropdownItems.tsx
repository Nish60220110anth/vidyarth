// constants/profileDropdownItems.ts
import {
    UserIcon,
    ClipboardDocumentCheckIcon,
    DocumentTextIcon,
    SpeakerWaveIcon,
    Cog6ToothIcon,
} from "@heroicons/react/24/outline";
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
    return {
        PROFILE: {
            label: "Profile",
            icon: (cls) => <UserIcon className={cls} />,
            perm: ACCESS_PERMISSION.ENABLE_PROFILE,
            component: () => <Profile name={name} email={email} role={role} id={id} />,
        },
        SHORTLISTS: {
            label: "Shortlists",
            icon: (cls) => <ClipboardDocumentCheckIcon className={cls} />,
            perm: ACCESS_PERMISSION.ENABLE_MY_SECTION,
            component: () => <Shortlists />,
        },
        MY_CV: {
            label: "My CV",
            icon: (cls) => <DocumentTextIcon className={cls} />,
            perm: ACCESS_PERMISSION.ENABLE_MY_CV,
            component: () => <MyCV name={name} email={email} role={role} id={id} />,
        },
        ANNOUNCEMENTS: {
            label: "Announcements",
            icon: (cls) => <SpeakerWaveIcon className={cls} />,
            perm: ACCESS_PERMISSION.ENABLE_ANNOUNCEMENTS,
            component: () => <Announcements />,
        },
        PREFERENCES: {
            label: "Preferences",
            icon: (cls) => <Cog6ToothIcon className={cls} />,
            perm: ACCESS_PERMISSION.ENABLE_PREFERENCES,
            component: () => <Preferences />,
        },
    };
}
