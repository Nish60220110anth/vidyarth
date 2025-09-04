import { USER_ROLE } from "@prisma/client";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import { roleIcons } from "@/constants/roleIcons";

interface Props {
    collapsed: boolean;
    name: string;
    email: string;
    role: string;
}

export default function SidebarUserProfile({ collapsed, name, email, role }: Props) {
    const IconComponent =
        roleIcons[role as USER_ROLE]?.icon || ((cls: string) => <UserCircleIcon className={cls} />);
    const iconColor = roleIcons[role as USER_ROLE]?.color || "text-cyan-300";

    return (
        <div className="px-3 py-2 w-full text-white">
            <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-[#1a2a36]">
                    {IconComponent(`h-7 w-7 ${iconColor}`)}
                </div>

                {!collapsed && (
                    <div className="flex flex-col justify-center overflow-hidden">
                        <span className="text-sm font-medium leading-tight truncate">{name}</span>
                        <span className="text-xs text-cyan-400 uppercase tracking-wide">{role}</span>
                        <span className="text-[0.7rem] text-gray-400 truncate max-w-[160px]">{email}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
