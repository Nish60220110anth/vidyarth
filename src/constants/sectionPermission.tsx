// constants/sectionsPermissions.ts
import {
    Squares2X2Icon,
    HomeIcon,
    BuildingOffice2Icon,
    NewspaperIcon,
    DocumentTextIcon,
    ClipboardDocumentListIcon,
    ComputerDesktopIcon,
    ChartBarIcon,
    UsersIcon,
    VideoCameraIcon,
    SpeakerWaveIcon,
    EnvelopeIcon,
    ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { ACCESS_PERMISSION } from "@prisma/client";
import { toast } from "react-hot-toast";
import { generateSecureURL } from "@/utils/shared/secureUrlApi";

import WelcomePage from "@/components/Welcome";
import MySection from "@/components/MySection";
import AllCompaniesDirectory from "@/components/AllCompaniesDirectory";
import LatestNews from "@/components/LatestNews";
import HowToPrepareCV from "@/components/CVPrep";
import DomainCVPrepGuide from "@/components/DomainPrep";
import AIMock from "@/components/AIMock";
import ManageCompanyList from "@/components/ManageCompanyList";
import ManageNews from "@/components/ManageNews";
import ManagePlacementCycle from "@/components/ManagePlacementCycle";
import ManageJD from "@/components/ManageJD";
import ManageCohort from "@/components/ManageCohort";
import ManageVideo from "@/components/ManageVideo";
import EmailProps from "@/components/EmailProps";
import PortalHelpFAQ from "@/components/PortalHelpFAQ";

import { NextRouter } from "next/router";
import { JSX } from "react";
import { Company } from "@/components/CompanySearchDropDown";

type SectionItem = {
    section: string;
    label: string;
    perm: ACCESS_PERMISSION;
    icon: (className: string) => JSX.Element;
    component: () => JSX.Element;
    shortcut: string;
};

type GetSectionsPermissionsArgs = {
    id: number;
    name: string;
    email: string;
    role: string;
    router: NextRouter;
    onCompanySelected: (company: Company) => void;
};

export function getSectionsPermissions({
    id,
    name,
    email,
    role,
    router,
    onCompanySelected,
}: GetSectionsPermissionsArgs): Record<string, SectionItem> {
    return {
        DASHBOARD: {
            section: "_generic",
            label: "Dashboard",
            perm: ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY,
            icon: (cls) => <Squares2X2Icon className={cls} />,
            component: () => (
                <WelcomePage
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
                />
            ),
            shortcut: "D",
        },
        MY_SECTION: {
            section: "_generic",
            label: "My Section",
            perm: ACCESS_PERMISSION.ENABLE_MY_SECTION,
            icon: (cls) => <HomeIcon className={cls} />,
            component: () => <MySection />,
            shortcut: "M",
        },
        COMPANY_DIRECTORY: {
            section: "_generic",
            label: "Company",
            perm: ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY,
            icon: (cls) => <BuildingOffice2Icon className={cls} />,
            component: () => <AllCompaniesDirectory onCompanySelected={onCompanySelected} />,
            shortcut: "C",
        },
        LATEST_NEWS: {
            section: "_generic",
            label: "News",
            perm: ACCESS_PERMISSION.ENABLE_NEWS,
            icon: (cls) => <NewspaperIcon className={cls} />,
            component: () => <LatestNews />,
            shortcut: "L",
        },
        CV_PREP: {
            section: "Preparation",
            label: "CV",
            perm: ACCESS_PERMISSION.ENABLE_CV_PREP,
            icon: (cls) => <DocumentTextIcon className={cls} />,
            component: () => <HowToPrepareCV />,
            shortcut: "V",
        },
        DOMAIN_PREP: {
            section: "Preparation",
            label: "Domain Prep",
            perm: ACCESS_PERMISSION.ENABLE_CV_PREP,
            icon: (cls) => <ClipboardDocumentListIcon className={cls} />,
            component: () => <DomainCVPrepGuide />,
            shortcut: "D",
        },
        AI_MOCK: {
            section: "Mock",
            label: "AI Mock",
            perm: ACCESS_PERMISSION.ENABLE_AI_MOCK,
            icon: (cls) => <ComputerDesktopIcon className={cls} />,
            component: () => <AIMock id={id} name={name} email={email} role={role} />,
            shortcut: "A",
        },
        COMPANY_LIST: {
            section: "Manage Content",
            label: "Company List",
            perm: ACCESS_PERMISSION.MANAGE_COMPANY_LIST,
            icon: (cls) => <BuildingOffice2Icon className={cls} />,
            component: () => <ManageCompanyList />,
            shortcut: "O",
        },
        NEWS: {
            section: "Manage Content",
            label: "News",
            perm: ACCESS_PERMISSION.MANAGE_NEWS,
            icon: (cls) => <ClipboardDocumentListIcon className={cls} />,
            component: () => <ManageNews />,
            shortcut: "N",
        },
        PLACEMENT_CYCLE: {
            section: "Manage Content",
            label: "Cycle",
            perm: ACCESS_PERMISSION.MANAGE_PLACEMENT_CYCLE,
            icon: (cls) => <ChartBarIcon className={cls} />,
            component: () => <ManagePlacementCycle />,
            shortcut: "P",
        },
        COMPANY_JD: {
            section: "Manage Content",
            label: "Job Description",
            perm: ACCESS_PERMISSION.MANAGE_COMPANY_JD,
            icon: (cls) => <DocumentTextIcon className={cls} />,
            component: () => <ManageJD />,
            shortcut: "J",
        },
        MY_COHORT: {
            section: "Manage Content",
            label: "Cohort",
            perm: ACCESS_PERMISSION.MANAGE_MY_COHORT,
            icon: (cls) => <UsersIcon className={cls} />,
            component: () => <ManageCohort />,
            shortcut: "H",
        },
        VIDEO: {
            section: "Manage Content",
            label: "Videos",
            perm: ACCESS_PERMISSION.MANAGE_VIDEOS,
            icon: (cls) => <VideoCameraIcon className={cls} />,
            component: () => <ManageVideo />,
            shortcut: "I",
        },
        ANNOUNCEMENTS: {
            section: "Announcements",
            label: "Announcements",
            perm: ACCESS_PERMISSION.MANAGE_EMAIL,
            icon: (cls) => <SpeakerWaveIcon className={cls} />,
            component: () => (
                <div className="p-6 text-gray-500">Announcements will be displayed here.</div>
            ),
            shortcut: "S",
        },
        NOTIFICATION: {
            section: "Announcements",
            label: "Notification",
            perm: ACCESS_PERMISSION.MANAGE_ANNOUNCEMENTS,
            icon: (cls) => <EnvelopeIcon className={cls} />,
            component: () => (
                <div className="p-6 text-gray-500">Email management will be available soon.</div>
            ),
            shortcut: "U",
        },
        PROPERTIES: {
            section: "Announcements",
            label: "Properties",
            perm: ACCESS_PERMISSION.MANAGE_ANNOUNCEMENTS,
            icon: (cls) => <EnvelopeIcon className={cls} />,
            component: () => <EmailProps />,
            shortcut: "Y",
        },
        PORTAL_HELP_FAQ: {
            section: "Help & FAQ",
            label: "FAQ",
            perm: ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY,
            icon: (cls) => <ShieldCheckIcon className={cls} />,
            component: () => <PortalHelpFAQ name={name} email={email} role={role} />,
            shortcut: "F",
        },
    };
}
