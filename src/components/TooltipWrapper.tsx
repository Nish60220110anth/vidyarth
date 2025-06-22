// components/TooltipWrapper.tsx
import * as Tooltip from "@radix-ui/react-tooltip";
import { useEffect, useState } from "react";

export function TooltipWrapper({ children, keyChar, label }: { children: React.ReactNode; keyChar: string, label: string }) {
    const [modifierKey, setModifierKey] = useState("Alt");
    const [show, setShow] = useState(false);

    useEffect(() => {
        const isMac = navigator.platform.toUpperCase().includes("MAC");
        setModifierKey(isMac ? "⌥" : "Alt");

        // const handleKeyDown = (e: KeyboardEvent) => {
        //     if (e.altKey) setShow(true);
        // };
        // const handleKeyUp = (e: KeyboardEvent) => {
        //     if (!e.altKey) setShow(false);
        // };

        // window.addEventListener("keydown", handleKeyDown);
        // window.addEventListener("keyup", handleKeyUp);
        // return () => {
        //     window.removeEventListener("keydown", handleKeyDown);
        //     window.removeEventListener("keyup", handleKeyUp);
        // };
    }, []);

    return (
        <Tooltip.Provider delayDuration={150}>
            <Tooltip.Root open={show ? true : undefined}>
                <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
                <Tooltip.Portal>
                    <Tooltip.Content
                        side="right"
                        sideOffset={8}
                        className="z-50 rounded-md bg-gray-900 text-white px-3 py-1 text-xs shadow-lg animate-fade-in"
                    >
                        <span className="whitespace-nowrap">{label} (Press {modifierKey} + {keyChar}) </span>
                        <Tooltip.Arrow className="fill-gray-900" />
                    </Tooltip.Content>
                </Tooltip.Portal>
            </Tooltip.Root>
        </Tooltip.Provider>
    );
}
