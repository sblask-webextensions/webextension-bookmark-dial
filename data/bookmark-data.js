/* eslint no-unused-vars: 0 */
function getBookmarkDataForNode(node) {
    let tags = node.querySelector(".tags").textContent.trim();
    return {
        id: parseInt(node.id),
        title: node.title,
        url: node.href,
        tags: tags ? tags.split(",") : undefined,
        index: [...(document.getElementsByTagName("a"))].indexOf(node),
    };
}
