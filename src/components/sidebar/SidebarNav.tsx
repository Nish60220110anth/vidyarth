import { JSX } from "react";
import { TooltipWrapper } from "../TooltipWrapper";

interface SidebarNavProps {
    collapsed: boolean;
    groupedItems: Record<
        string,
        {
            label: string;
            icon: (cls: string) => JSX.Element;
            component: () => JSX.Element;
            key: string;
            shortcut: string;
            _label: string;
        }[]
    >;
    activeKey: string | null;
    onItemClick: (key: string) => void;
}

export default function SidebarNav({
    collapsed,
    groupedItems,
    activeKey,
    onItemClick,
}: SidebarNavProps) {
    return (
        <nav className="flex-1 overflow-y-auto mt-4">
            {Object.entries(groupedItems).map(([section, items]) => (
                <div key={section} className="mb-4">
                    {section !== "_generic" && !collapsed && (
                        <div className="px-4 text-xs font-bold uppercase text-gray-400 mb-2">
                            {section}
                        </div>
                    )}

                    {items.map(({ label, icon, key, shortcut, _label }) => (
                        <TooltipWrapper keyChar={shortcut} label={label} key={label}>
                            <div
                                className={`flex items-center justify-between py-3 pr-4 pl-2 mx-2 mb-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer
                ${activeKey === key
                                        ? "bg-white/10 text-cyan-400 border-l-4 border-cyan-400"
                                        : "hover:bg-white/10 pl-4"
                                    }`}
                                onClick={() => onItemClick(key)}>
                                <div className="flex items-center gap-4">
                                    {icon("h-5 w-5")}
                                    {!collapsed && <span className="text-sm">{_label.toLocaleUpperCase()}</span>}
                                </div>
                                {!collapsed && shortcut && (
                                    <span className="ml-auto bg-white/20 text-[0.65rem] px-2 py-0.5 rounded-md text-white">
                                        {shortcut}
                                    </span>
                                )}
                            </div>
                        </TooltipWrapper>
                    ))}
                </div>
            ))}
        </nav>
    );
}
