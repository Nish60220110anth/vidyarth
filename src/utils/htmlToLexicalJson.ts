// src/utils/htmlToLexicalJson.ts
import { JSDOM } from "jsdom";
import { createHeadlessEditor } from "@lexical/headless";
import { $generateNodesFromDOM } from "@lexical/html";
import {
    $getRoot,
    ParagraphNode,
    TextNode,
    LineBreakNode,
    RootNode,
    $insertNodes,
    createEditor,
} from "lexical";

import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import fs from "fs";

export function htmlToLexicalJSON(html: string) {

    // console.log("Converting HTML to Lexical JSON");
    // console.log("HTML content:", html);
    // const editorConfig = {
    //     namespace: "vidyarth",
    //     onError(error: unknown) {
    //         throw error;
    //     },
    //     nodes: [
    //         HeadingNode,
    //         ListNode,
    //         ListItemNode,
    //         QuoteNode,
    //         CodeNode,
    //         CodeHighlightNode,
    //         TableNode,
    //         TableCellNode,
    //         TableRowNode,
    //         AutoLinkNode,
    //         LinkNode,

    //         TextNode,
    //         ParagraphNode,
    //         LineBreakNode,
    //         RootNode
    //     ]
    // };

    // const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);

    // console.log("Document body innerHTML:", dom.window.document.body.innerHTML);
    // console.log("Document body child nodes:", dom.window.document.body.childNodes);
    // const editor = createHeadlessEditor({ ...editorConfig });

    // editor.update(() => {
    //     const root = $getRoot();
    //     root.clear();

    //     const nodes = $generateNodesFromDOM(editor, dom.window.document);
    //     if (nodes.length === 0) {
    //         console.warn("No nodes generated from HTML. Inserting default nodes.");
    //     }else {
    //         console.log("Nodes generated successfully:", nodes);
    //     }

    //     if (nodes.length > 0) {
    //         root.append(...nodes);
    //     } else {
    //         // If no nodes were generated, insert a default paragraph
    //         const paragraphNode = new ParagraphNode();
    //         paragraphNode.append(new TextNode(" "));
    //         root.append(paragraphNode);
    //     }
    // });

    // const lexicalJson = editor.getEditorState().toJSON();
    // console.log("Lexical JSON generated:", lexicalJson);
    // return lexicalJson;

    const editor = createHeadlessEditor({
        nodes: [
            HeadingNode,
            TextNode,
            ParagraphNode,
            ListNode,
            ListItemNode,
            LinkNode
        ],
    });

    editor.update(
        () => {
            const jsdom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
            // console.log("Document body innerHTML:", jsdom.window.document.body.innerHTML);
            const nodes = $generateNodesFromDOM(editor, jsdom.window.document);
            $insertNodes(nodes);
        },
        { discrete: true }
    );

    const content = editor.getEditorState().toJSON();
    fs.writeFileSync('lexical.json', JSON.stringify(content, null, 2));
    return editor.getEditorState().toJSON();
}
