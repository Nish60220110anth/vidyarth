export function convertListsToParagraphs(jsonString: string): string {
    try {
        const json = JSON.parse(jsonString);
        const walk = (nodes: any[]): any[] =>
            nodes.flatMap((node) => {
                if (node.type === "list") {
                    // Convert list to flat array of paragraphs
                    return node.children.map((liNode: any) => ({
                        type: "paragraph",
                        version: 1,
                        children: liNode.children,
                    }));
                } else if (node.children) {
                    return [{ ...node, children: walk(node.children) }];
                } else {
                    return node;
                }
            });

        const transformed = {
            ...json,
            root: {
                ...json.root,
                children: walk(json.root.children),
            },
        };

        return JSON.stringify(transformed);
    } catch (e) {
        console.error("Failed to transform Lexical JSON", e);
        return jsonString; // fallback to original if error
    }
}
