import { $generateHtmlFromNodes } from "@lexical/html";
import { createEditor, LexicalEditor } from "lexical";

import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { TRANSFORMERS } from "@lexical/markdown";
import { lexicalTheme } from "@/theme/lexcialTheme";
import { customLexicalTree } from "./CustomLexicalTree";


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


export function convertLexicalJsonToHtml(lexicalJson: any): string {
    const editor = createEditor({
        theme: editorConfig.theme,
        namespace: editorConfig.namespace,
        nodes: editorConfig.nodes
    });

    let html = "";

    editor.update(() => {
        const editorState = editor.parseEditorState(JSON.parse(lexicalJson));
        html = $generateHtmlFromNodes(editor, null);

        console.log("Convert: ", lexicalJson, html)
    });

    return html;
}
