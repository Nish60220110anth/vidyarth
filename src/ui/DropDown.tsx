'use client';

import * as React from 'react';
import {
    JSX,
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';

/** ================================
 *  Context
 *  ================================ */
type DropDownContextType = {
    // NOTE: useRef returns a MutableRefObject<T | null>, so accept that
    registerItem: (ref: React.MutableRefObject<HTMLButtonElement | null>) => void;
};

const DropDownContext = React.createContext<DropDownContextType | null>(null);

/** ================================
 *  DropDownItem
 *  ================================ */
export function DropDownItem({
    children,
    className,
    onClick,
    title,
}: {
    children: React.ReactNode;
    className: string;
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
    title?: string;
}) {
    const ref = useRef<HTMLButtonElement | null>(null);

    const dropDownContext = React.useContext(DropDownContext);
    if (dropDownContext === null) {
        throw new Error('DropDownItem must be used within a DropDown');
    }

    const { registerItem } = dropDownContext;

    useEffect(() => {
        // ref identity is stable; no need to include in deps
        registerItem(ref);
    }, [registerItem]);

    return (
        <button
            className={className}
            onClick={onClick}
            ref={ref}
            title={title}
            type="button"
            role="menuitem"
        >
            {children}
        </button>
    );
}

/** ================================
 *  DropDownItems
 *  ================================ */
function DropDownItems({
    children,
    dropDownRef,
    onClose,
}: {
    children: React.ReactNode;
    // This is what useRef<HTMLDivElement | null> actually is:
    dropDownRef: React.MutableRefObject<HTMLDivElement | null>;
    onClose: () => void;
}) {
    const [items, setItems] = useState<
        React.MutableRefObject<HTMLButtonElement | null>[]
    >([]);
    const [highlightedItem, setHighlightedItem] =
        useState<React.MutableRefObject<HTMLButtonElement | null> | null>(null);

    const registerItem = useCallback(
        (itemRef: React.MutableRefObject<HTMLButtonElement | null>) => {
            setItems(prev => [...prev, itemRef]);
        },
        []
    );

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (items.length === 0) return;

        const key = event.key;

        if (['Escape', 'ArrowUp', 'ArrowDown', 'Tab'].includes(key)) {
            event.preventDefault();
        }

        if (key === 'Escape' || key === 'Tab') {
            onClose();
            return;
        }

        if (key === 'ArrowUp') {
            setHighlightedItem(prev => {
                const idx = prev ? items.indexOf(prev) : 0;
                const next = (idx - 1 + items.length) % items.length;
                return items[next];
            });
            return;
        }

        if (key === 'ArrowDown') {
            setHighlightedItem(prev => {
                const idx = prev ? items.indexOf(prev) : -1;
                const next = (idx + 1) % items.length; // wrap at end
                return items[next];
            });
            return;
        }
    };

    const contextValue = useMemo(
        () => ({
            registerItem,
        }),
        [registerItem]
    );

    useEffect(() => {
        if (items.length && !highlightedItem) {
            setHighlightedItem(items[0]);
        }
        if (highlightedItem?.current) {
            highlightedItem.current.focus();
        }
    }, [items, highlightedItem]);

    return (
        <DropDownContext.Provider value={contextValue}>
            <div
                className="dropdown"
                ref={dropDownRef}
                onKeyDown={handleKeyDown}
                role="menu"
            >
                {children}
            </div>
        </DropDownContext.Provider>
    );
}

/** ================================
 *  DropDown (root)
 *  ================================ */
export function DropDown({
    disabled = false,
    buttonLabel,
    buttonAriaLabel,
    buttonClassName,
    buttonIconClassName,
    children,
    stopCloseOnClickSelf,
}: {
    disabled?: boolean;
    buttonAriaLabel?: string;
    buttonClassName: string;
    buttonIconClassName?: string;
    buttonLabel?: string;
    children: ReactNode;
    /** If true, clicks inside the dropdown won't close it */
    stopCloseOnClickSelf?: boolean;
}): JSX.Element {
    const dropDownRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const [showDropDown, setShowDropDown] = useState(false);

    const handleClose = () => {
        setShowDropDown(false);
        buttonRef.current?.focus();
    };

    // Position the dropdown near the button when opened
    useEffect(() => {
        const button = buttonRef.current;
        const dropDown = dropDownRef.current;

        if (showDropDown && button && dropDown) {
            const { top, left, height } = button.getBoundingClientRect();
            // Use offsetHeight only after element is in the DOM
            const offsetWidth = dropDown.offsetWidth;
            dropDown.style.position = 'fixed';
            dropDown.style.top = `${top + height + 8}px`;
            dropDown.style.left = `${Math.min(
                left,
                window.innerWidth - offsetWidth - 20
            )}px`;
        }
    }, [showDropDown]);

    // Close on outside click (optionally ignore clicks inside dropdown)
    useEffect(() => {
        if (!showDropDown) return;

        const handle = (event: MouseEvent) => {
            const target = event.target as Node | null;
            const button = buttonRef.current;
            const panel = dropDownRef.current;

            if (!target || !button) return;

            if (stopCloseOnClickSelf && panel && panel.contains(target)) {
                return; // ignore clicks inside panel
            }

            if (!button.contains(target)) {
                setShowDropDown(false);
            }
        };

        document.addEventListener('click', handle);
        return () => document.removeEventListener('click', handle);
    }, [showDropDown, stopCloseOnClickSelf]);

    return (
        <>
            <button
                disabled={disabled}
                aria-haspopup="menu"
                aria-expanded={showDropDown}
                aria-label={buttonAriaLabel || buttonLabel}
                className={buttonClassName}
                onClick={() => setShowDropDown(prev => !prev)}
                ref={buttonRef}
                type="button"
            >
                {buttonIconClassName && <span className={buttonIconClassName} />}
                {buttonLabel && (
                    <span className="text dropdown-button-text">{buttonLabel}</span>
                )}
                <i className="chevron-down" />
            </button>

            {showDropDown &&
                createPortal(
                    <DropDownItems dropDownRef={dropDownRef} onClose={handleClose}>
                        {children}
                    </DropDownItems>,
                    document.body
                )}
        </>
    );
}
