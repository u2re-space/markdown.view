const VIEWER_PAGE = "viewer.html";
const CONTEXT_MENU_ID = "markdown-view:open";
const VIEWER_ORIGIN = chrome.runtime.getURL("");
const VIEWER_URL = chrome.runtime.getURL(VIEWER_PAGE);
const MARKDOWN_EXTENSION_PATTERN = /\.(?:md|markdown|mdown|mkd|mkdn|mdtxt|mdtext)(?:$|[?#])/i;

const isMarkdownUrl = (candidate?: string | null): candidate is string => {
    if (!candidate || typeof candidate !== "string") return false;
    try {
        const url = new URL(candidate);
        if (url.protocol === "chrome-extension:") return false;
        if (!["http:", "https:", "file:", "ftp:"].includes(url.protocol)) return false;
        return MARKDOWN_EXTENSION_PATTERN.test(url.pathname);
    } catch {
        return false;
    }
};

const toViewerUrl = (source?: string | null) => {
    if (!source) return VIEWER_URL;
    return `${VIEWER_URL}?src=${encodeURIComponent(source)}`;
};

const openViewer = (source?: string | null, destinationTabId?: number) => {
    const url = toViewerUrl(source ?? undefined);
    if (typeof destinationTabId === "number") {
        chrome.tabs.update(destinationTabId, { url });
    } else {
        chrome.tabs.create({ url });
    }
};

chrome.runtime.onInstalled?.addListener?.(() => {
    chrome.contextMenus.removeAll?.(() => {
        chrome.contextMenus.create({
            id: CONTEXT_MENU_ID,
            title: "Open in Markdown Viewer",
            contexts: ["link", "page"],
            targetUrlPatterns: [
                "*://*/*.md",
                "*://*/*.markdown",
                "file://*/*.md",
                "file://*/*.markdown",
            ],
        });
    });
});

chrome.contextMenus.onClicked?.addListener?.((info, tab) => {
    if (info.menuItemId !== CONTEXT_MENU_ID) return;
    const candidate = info.linkUrl || info.pageUrl;
    if (isMarkdownUrl(candidate)) {
        openViewer(candidate, info.tabId ?? tab?.id);
    } else {
        openViewer(candidate, tab?.id);
    }
});

chrome.action.onClicked?.addListener?.((tab) => {
    openViewer(undefined, tab?.id);
});

chrome.webNavigation.onCommitted?.addListener?.((details) => {
    if (details.frameId !== 0) return;
    const { tabId, url } = details;
    if (!isMarkdownUrl(url)) return;
    if (url.startsWith(VIEWER_ORIGIN)) return;
    openViewer(url, tabId);
});
