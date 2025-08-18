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
        <nav
            className="
        flex-1 overflow-y-auto mt-2 md:mt-4
        px-1 md:px-0
        scroll-smooth overscroll-contain
      "
        >
            {Object.entries(groupedItems).map(([section, items]) => (
                <div key={section} className="mb-3 md:mb-4">
                    {section !== "_generic" && !collapsed && (
                        <div className="px-3 md:px-4 text-[10px] md:text-xs font-bold uppercase text-gray-400 mb-1.5 md:mb-2">
                            {section}
                        </div>
                    )}

                    {items.map(({ label, icon, key, shortcut, _label }) => {
                        const isActive = activeKey === key;

                        return (
                            <TooltipWrapper keyChar={shortcut} label={label} key={label}>
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") onItemClick(key);
                                    }}
                                    className={`
                    flex items-center justify-between
                    py-2.5 md:py-3
                    pr-3 md:pr-4
                    ${isActive ? "pl-2" : "pl-3 md:pl-4"}
                    mx-1.5 md:mx-2 mb-1.5 md:mb-2
                    rounded-lg text-sm font-semibold
                    select-none
                    transition-all duration-200 cursor-pointer
                    min-h-[42px]
                    ${isActive
                                            ? "bg-white/10 text-cyan-400 border-l-4 border-cyan-400"
                                            : "hover:bg-white/10"}
                  `}
                                    onClick={() => onItemClick(key)}
                                    aria-current={isActive ? "page" : undefined}
                                >
                                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                        {icon("h-5 w-5 shrink-0")}
                                        {!collapsed && (
                                            <span className="text-sm truncate">
                                                {_label.toLocaleUpperCase()}
                                            </span>
                                        )}
                                    </div>

                                    {!collapsed && shortcut && (
                                        <span className="ml-2 bg-white/20 text-[0.60rem] md:text-[0.65rem] px-1.5 md:px-2 py-0.5 rounded-md text-white shrink-0">
                                            {shortcut}
                                        </span>
                                    )}
                                </div>
                            </TooltipWrapper>
                        );
                    })}
                </div>
            ))}
        </nav>
    );
}
