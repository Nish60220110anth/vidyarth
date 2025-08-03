// lib/lexicalToHtml.ts
import { CodeNode } from '@lexical/code';
import { createHeadlessEditor } from '@lexical/headless';
import { $generateHtmlFromNodes } from '@lexical/html';
import { ListItemNode, ListNode } from '@lexical/list';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { JSDOM } from 'jsdom';
import { ParagraphNode, TextNode } from 'lexical';

const dom = new JSDOM();
global.window = dom.window as any;
global.document = dom.window.document as any;

const editor = createHeadlessEditor({
    namespace: 'HeadlessEditor',
    onError(error) {
        console.error('[Lexical Headless]', error);
    },
    nodes: [
        HeadingNode,
        ListNode,
        ListItemNode,
        TextNode,
        ParagraphNode,
        QuoteNode,
        CodeNode,
    ],
});

export async function lexicalStateToHtml(
    serializedState: string | object
): Promise<string> {

    const state = typeof serializedState === 'string'
        ? JSON.parse(serializedState)
        : serializedState;
    editor.setEditorState(editor.parseEditorState(state));

    return new Promise((resolve) => {
        editor.update(() => {
            const htmlString = $generateHtmlFromNodes(editor, null);
            resolve(htmlString);
        }, { discrete: true });
    });
}
