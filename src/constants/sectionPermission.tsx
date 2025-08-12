// constants/sectionsPermissions.ts
import { ACCESS_PERMISSION } from "@prisma/client";
import { toast } from "react-hot-toast";
import { generateSecureURL } from "@/utils/shared/secureUrlApi";

import WelcomePage from "@/components/Welcome";
import MySection from "@/components/MySection";
import AllCompaniesDirectory from "@/components/AllCompaniesDirectory";
import LatestNews from "@/components/LatestNews";
import HowToPrepareCV from "@/components/CVPrep";
import DomainCVPrepGuide from "@/components/DomainPrep";
import ManageCompanyList from "@/components/ManageCompanyList";
import ManageNews from "@/components/ManageNews";
import ManagePlacementCycle from "@/components/ManagePlacementCycle";
import ManageJD from "@/components/ManageJD";
import ManageVideo from "@/components/ManageVideo";
import EmailProps from "@/components/EmailProps";

import { NextRouter } from "next/router";
import { JSX } from "react";
import { Company } from "@/components/CompanySearchDropDown";

import { Home, Users, Briefcase, Newspaper, FileText, ClipboardList, Monitor, BarChart2, Video, Settings2, Rss, FileUser, Tag } from 'lucide-react';

type SectionItem = {
    section: string;
    label: string;
    perm: ACCESS_PERMISSION;
    icon: (className: string) => JSX.Element;
    component: () => JSX.Element;
    shortcut: string;
    show: boolean
};

type GetSectionsPermissionsArgs = {
    id: number;
    name: string;
    email: string;
    role: string;
    router: NextRouter;
    onCompanySelected: (company: Company) => void;
};
export function getSectionsPermissions({ id, name, email, role, router, onCompanySelected }: GetSectionsPermissionsArgs): Record<string, SectionItem> {
    const all: Record<string, SectionItem> = {
        DASHBOARD: {
            section: "_generic",
            label: "Dashboard",
            perm: ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY,
            icon: (cls) => <Home className={cls} size={20} strokeWidth={1.5} />,
            component: () => <WelcomePage
                onGotoDashboard={async () => {
                    const res = await generateSecureURL("COMPANY DIRECTORY", 0);
                    if (!res.success) {
                        toast.error(res.error);
                        return;
                    }
                    router.push({ query: { auth: encodeURIComponent(res.url) } }, undefined, {
                        shallow: false,
                    });
                }}
            />,
            shortcut: "D", show: true,
        },
        MY_SECTION: {
            section: "_generic",
            label: "My Section",
            perm: ACCESS_PERMISSION.ENABLE_MY_SECTION,
            icon: (cls) => <Users className={cls} size={20} strokeWidth={1.5} />,
            component: () => <MySection />,
            shortcut: "M", show: true,
        },
        COMPANY_DIRECTORY: {
            section: "_generic",
            label: "Company",
            perm: ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY,
            icon: (cls) => <Briefcase className={cls} size={20} strokeWidth={1.5} />,
            component: () => <AllCompaniesDirectory onCompanySelected={onCompanySelected} />,
            shortcut: "C", show: true,
        },
        LATEST_NEWS: {
            section: "_generic",
            label: "News",
            perm: ACCESS_PERMISSION.ENABLE_NEWS,
            icon: (cls) => <Rss className={cls} size={20} strokeWidth={1.5} />,
            component: () => <LatestNews />,
            shortcut: "N", show: true,
        },
        CV_PREP: {
            section: "Preparation",
            label: "CV Prep",
            perm: ACCESS_PERMISSION.ENABLE_CV_PREP,
            icon: (cls) => <FileUser className={cls} size={20} strokeWidth={1.5} />,
            component: () => <HowToPrepareCV />,
            shortcut: "V", show: true,
        },
        DOMAIN_PREP: {
            section: "Preparation",
            label: "Domain Prep",
            perm: ACCESS_PERMISSION.ENABLE_CV_PREP,
            icon: (cls) => <Tag className={cls} size={20} strokeWidth={1.5} />,
            component: () => <DomainCVPrepGuide />,
            shortcut: "R", show: true,
        },
        COMPANY_LIST: {
            section: "Manage Content",
            label: "Company List",
            perm: ACCESS_PERMISSION.MANAGE_COMPANY_LIST,
            icon: (cls) => <Monitor className={cls} size={20} strokeWidth={1.5} />,
            component: () => <ManageCompanyList />,
            shortcut: "L", show: true,
        },
        NEWS: {
            section: "Manage Content",
            label: "News",
            perm: ACCESS_PERMISSION.MANAGE_NEWS,
            icon: (cls) => <ClipboardList className={cls} size={20} strokeWidth={1.5} />,
            component: () => <ManageNews />,
            shortcut: "W", show: true,
        },
        PLACEMENT_CYCLE: {
            section: "Manage Content",
            label: "Cycle",
            perm: ACCESS_PERMISSION.MANAGE_PLACEMENT_CYCLE,
            icon: (cls) => <BarChart2 className={cls} size={20} strokeWidth={1.5} />,
            component: () => <ManagePlacementCycle />,
            shortcut: "Y", show: true,
        },
        COMPANY_JD: {
            section: "Manage Content",
            label: "Job Description",
            perm: ACCESS_PERMISSION.MANAGE_COMPANY_JD,
            icon: (cls) => <FileText className={cls} size={20} strokeWidth={1.5} />,
            component: () => <ManageJD />,
            shortcut: "J", show: true,
        },
        VIDEO: {
            section: "Manage Content",
            label: "Videos",
            perm: ACCESS_PERMISSION.MANAGE_VIDEOS,
            icon: (cls) => <Video className={cls} size={20} strokeWidth={1.5} />,
            component: () => <ManageVideo />,
            shortcut: "I", show: true,
        },
        PROPERTIES: {
            section: "Announcements",
            label: "Properties",
            perm: ACCESS_PERMISSION.MANAGE_ANNOUNCEMENTS,
            icon: (cls) => <Settings2 className={cls} size={20} strokeWidth={1.5} />,
            component: () => <EmailProps />,
            shortcut: "P", show: true,
        },
    };

    const visible: Record<string, SectionItem> = {};
    for (const k in all) if (all[k].show) visible[k] = all[k];
    return visible;
}
