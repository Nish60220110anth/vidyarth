import { USER_ROLE } from "@prisma/client";
import { JSX } from "react";

import {
    ShieldCheckIcon,
    AcademicCapIcon,
    BriefcaseIcon,
    BanknotesIcon,
    WrenchScrewdriverIcon,
    SparklesIcon,
    ChartBarSquareIcon,
    UserCircleIcon,
    UsersIcon,
} from "@heroicons/react/24/solid";

const createRoleIcon = (icon: (cls: string) => JSX.Element, color: string) => ({
    icon,
    color,
});

export const roleIcons: Record<
    USER_ROLE,
    { icon: (cls: string) => JSX.Element; color: string }
> = {
    ADMIN: createRoleIcon((cls) => <ShieldCheckIcon className={cls} />, "text-red-400"),
    STUDENT: createRoleIcon((cls) => <AcademicCapIcon className={cls} />, "text-blue-300"),
    SUPER_STUDENT: createRoleIcon((cls) => <SparklesIcon className={cls} />, "text-purple-400"),
    PLACECOM: createRoleIcon((cls) => <BriefcaseIcon className={cls} />, "text-green-300"),
    DISHA: createRoleIcon((cls) => <UsersIcon className={cls} />, "text-orange-300"),
    ALUMNI: createRoleIcon((cls) => <UserCircleIcon className={cls} />, "text-indigo-300"),
    CCA_FINANCE: createRoleIcon((cls) => <BanknotesIcon className={cls} />, "text-emerald-300"),
    CCA_CONSULT: createRoleIcon((cls) => <ChartBarSquareIcon className={cls} />, "text-cyan-300"),
    CCA_PRODMAN: createRoleIcon((cls) => <WrenchScrewdriverIcon className={cls} />, "text-pink-300"),
    CCA_OPERATIONS: createRoleIcon((cls) => <WrenchScrewdriverIcon className={cls} />, "text-teal-300"),
    CCA_GENMAN: createRoleIcon((cls) => <UsersIcon className={cls} />, "text-lime-300"),
    CCA_MARKETING: createRoleIcon((cls) => <SparklesIcon className={cls} />, "text-rose-300"),
};
