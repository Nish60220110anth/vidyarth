import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface SidebarHeaderProps {
    collapsed: boolean;
    toggleSidebar: () => void;
}

export default function SidebarHeader({ collapsed, toggleSidebar }: SidebarHeaderProps) {
    return (
        <div className="flex items-center justify-between p-4 border-b border-gray-800 mt-2 flex-row">
            {!collapsed ? (
                <div className="flex items-center gap-3 mt-2">
                    <Image
                        src="/logo.png"
                        alt="Logo"
                        width={40}
                        height={40}
                        className="object-contain filter invert brightness-0 saturate-100 hue-rotate-[170deg]"
                        priority
                    />
                    <span className="text-[1.15rem] font-bold tracking-wide">VIDYARTH</span>
                </div>
            ) : (
                <Image
                    src="/logo.png"
                    alt="Logo"
                    width={40}
                    height={40}
                    className="object-contain filter invert brightness-0 saturate-100 hue-rotate-[170deg] mt-2"
                    priority
                />
            )}

            <button onClick={toggleSidebar} className="text-white text-xl ml-2 mt-2">
                {collapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
            </button>
        </div>
    );
}
