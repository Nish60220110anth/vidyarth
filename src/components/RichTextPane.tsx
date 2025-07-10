'use client';

import { JSX, useEffect, useState } from "react";

/* Lexical Design System */
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import {InlineImageNode} from "@/plugins/InlineImageNode";
import { TRANSFORMERS } from "@lexical/markdown";

/* Lexical Plugins Local */
import TreeViewPlugin from "@/plugins/TreeViewPlugin";
import ToolbarPlugin from "@/plugins/ToolbarPlugin";
import AutoLinkPlugin from "@/plugins/AutoLinkPlugin";
import CodeHighlightPlugin from "@/plugins/CodeHighlightPlugin";
import ImagePlugin from "@/plugins/InlineImagePlugin";

/* Lexical Plugins Remote */
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin'

/* Lexical Others */
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { lexicalTheme } from "@/theme/lexcialTheme";


import { customLexicalTree } from "@/utils/CustomLexicalTree";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { EditorState, LexicalEditor } from "lexical";
import { toast } from "react-hot-toast";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";


function Placeholder(placeholder: { placeholder: string }) {
    return <div className="editor-placeholder">{`${placeholder}`}</div>;
}

const editorConfig = {

    theme: lexicalTheme,
    namespace: "vidyarth",
    onError(error: unknown) {
        throw error;
    },
    nodes: [
        HeadingNode,
        ListNode,
        ListItemNode,
        QuoteNode,
        CodeNode,
        CodeHighlightNode,
        TableNode,
        TableCellNode,
        TableRowNode,
        AutoLinkNode,
        LinkNode,
        // InlineImageNode,
        // HorizontalRuleNode
    ]
};

function OnChangePlugin({ onChange }: { onChange: (editorState: EditorState, editor: LexicalEditor) => any }) {

    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            onChange(editorState, editor);
        });
    }, [editor.getEditorState(), onChange]);

    return null;
}

function ReadOnlyPlugin({ editable }: { editable: boolean }) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        editor.setEditable(editable);
    }, [editor, editable]);

    return null;
}

function LoadLexicalStatePlugin({
    lexicalState,
    editable,
}: {
    lexicalState?: string;
    editable: boolean;
}) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (lexicalState && !editable) {
            try {
                const parsed = JSON.parse(lexicalState);
                const newEditorState = editor.parseEditorState(parsed);
                editor.setEditorState(newEditorState);
                console.log('Lexical state loaded.');
            } catch (err) {
                toast.error('Failed to load lexical content');
                console.error(err);
            }
        }
    }, [editor, lexicalState, editable]);

    return null;
}


export function RichTextPane({ OnSetContent, editable, lexicalState, placeholder }:
    { OnSetContent?: (arg0: string) => void, editable: boolean, lexicalState?: string, placeholder: string }) {

    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true);
    }, [])

    if (!isMounted) return null

    const OnChange = (_editorState: EditorState, _editor: LexicalEditor) => {
        const json = JSON.stringify(_editorState.toJSON());
        OnSetContent && OnSetContent(json);
    };

    return (
        <div className="bg-gray-50 font-[Urbanist] px-6 py-6 flex flex-col items-center justify-center">
            <LexicalComposer initialConfig={
                {
                    ...editorConfig,
                }
            }>
                <div className="editor-container w-full">
                    {editable && <ToolbarPlugin />}
                    <ReadOnlyPlugin editable={editable} />
                    <LoadLexicalStatePlugin lexicalState={lexicalState} editable={editable} />
                    <div className="editor-inner">
                        <RichTextPlugin
                            contentEditable={<ContentEditable className="editor-input w-full" />}
                            placeholder={<div className="editor-placeholder">{placeholder}</div>}
                            ErrorBoundary={LexicalErrorBoundary}
                        />
                        <ListPlugin />
                        <HistoryPlugin />
                        <AutoFocusPlugin />
                        <CodeHighlightPlugin />
                        <LinkPlugin />
                        <TabIndentationPlugin />
                        <AutoLinkPlugin />
                        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
                        <ClearEditorPlugin />
                        <OnChangePlugin onChange={OnChange} />
                        {/* <ImagePlugin captionsEnabled={true}/> */}
                        {/* <HorizontalRulePlugin /> */}
                        {process.env.NODE_ENV === "development" && false && <TreeViewPlugin />}
                    </div>
                </div>
            </LexicalComposer>
        </div>
    );
}
