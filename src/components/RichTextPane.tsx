'use client';

import { JSX, useEffect, useState } from "react";

/* Lexical Design System */
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { TRANSFORMERS } from "@lexical/markdown";

/* Lexical Plugins Local */
import TreeViewPlugin from "@/plugins/TreeViewPlugin";
import ToolbarPlugin from "@/plugins/ToolbarPlugin";
import AutoLinkPlugin from "@/plugins/AutoLinkPlugin";
import CodeHighlightPlugin from "@/plugins/CodeHighlightPlugin";

/* Lexical Plugins Remote */
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";

/* Lexical Others */
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { lexicalTheme } from "@/theme/lexcialTheme";


import { customLexicalTree } from "@/utils/CustomLexicalTree";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { EditorState, LexicalEditor } from "lexical";
import { convertLexicalJsonToHtml } from "@/utils/ConvertLexJSON";

function Placeholder() {
    return <div className="editor-placeholder">Enter some rich text...</div>;
}

const editorConfig = {

    theme: lexicalTheme,
    namespace: "vidyarth",
    editorState: customLexicalTree,
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
        LinkNode
    ],
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


export function RichTextPane({ OnSetContent }: { OnSetContent: (arg0: string) => void }): JSX.Element | null {

    const [isMounted, setIsMounted] = useState(false)
    const [content, setContent] = useState<string>("");

    useEffect(() => {
        setIsMounted(true);
    }, [])

    if (!isMounted) return null

    const OnChange = (_editorState: EditorState, _editor: LexicalEditor) => {
        const json = JSON.stringify(_editorState.toJSON());

        setContent(json);

        const html = convertLexicalJsonToHtml(json);
        OnSetContent(html);


    };


    return (
        <div className="min-h-screen bg-gray-50 font-[Urbanist] px-6 py-6 flex flex-col items-center justify-center" >
            <LexicalComposer initialConfig={editorConfig}>
                <div className="editor-container">
                    <ToolbarPlugin />
                    <div className="editor-inner">
                        <RichTextPlugin
                            contentEditable={<ContentEditable className="editor-input" />}
                            placeholder={<Placeholder />}
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
                        {process.env.NODE_ENV == "development" && false && <TreeViewPlugin />}
                    </div>
                </div>
            </LexicalComposer>
        </div>
    );
}
