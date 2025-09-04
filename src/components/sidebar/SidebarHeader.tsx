import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/router";

interface SidebarHeaderProps {
    collapsed: boolean;
    toggleSidebar: () => void;
}

export default function SidebarHeader({ collapsed, toggleSidebar }: SidebarHeaderProps) {

    const { basePath } = useRouter();
    
    return (
        <div className="flex items-center justify-between p-2 border-b border-gray-800 flex-row">
            {!collapsed ? (
                <div className="flex items-center gap-3 mt-2">
                    <Image
                        src={`${basePath}/logo.png`}
                        alt="Logo"
                        width={40}
                        height={40}
                        sizes="40px"
                        className="object-contain filter invert brightness-0 saturate-100 hue-rotate-[170deg]"
                        priority
                    />
                    <span className="text-[1.15rem] font-bold tracking-wide">CHARON</span>
                </div>
            ) : (
                <Image
                    src={`${basePath}/logo.png`}
                    alt="Logo"
                    width={40}
                    height={40}
                    sizes="40px"
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
