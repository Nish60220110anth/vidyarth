// src/utils/htmlToLexicalJson.ts
import { JSDOM } from "jsdom";
import { createHeadlessEditor } from "@lexical/headless";
import { $generateNodesFromDOM } from "@lexical/html";
import {
    ParagraphNode,
    TextNode,
    $insertNodes,
} from "lexical";

import { HeadingNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";
import fs from "fs";

export function htmlToLexicalJSON(html: string) {
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
