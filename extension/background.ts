const VIEWER_PAGE = "viewer.html";
const CONTEXT_MENU_ID = "markdown-view:open";
const VIEWER_ORIGIN = chrome.runtime.getURL("");
const VIEWER_URL = chrome.runtime.getURL(VIEWER_PAGE);
const MARKDOWN_EXTENSION_PATTERN = /\.(?:md|markdown|mdown|mkd|mkdn|mdtxt|mdtext)(?:$|[?#])/i;
const REMOTE_CHECK_TIMEOUT_MS = 2000;
const REMOTE_PROTOCOLS = new Set(["http:", "https:"]);
const REMOTE_NATURE_CACHE = new Map<string, boolean>();
const REMOTE_PENDING_CHECKS = new Map<string, Promise<boolean>>();

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

const isRemoteProtocol = (protocol?: string | null) => (protocol ? REMOTE_PROTOCOLS.has(protocol) : false);

const normalizeContentType = (value?: string | null) => value?.split?.(";")?.[0]?.trim?.().toLowerCase() ?? "";

const isHtmlOrXmlContentType = (value?: string | null) => {
    const normalized = normalizeContentType(value);
    if (!normalized) return false;
    if (normalized.includes("html")) return true;
    if (normalized.includes("xml")) return true;
    return false;
};

const stopResponseBody = async (response: Response) => {
    const { body } = response;
    if (!body || typeof body.cancel !== "function") return;
    try {
        await body.cancel();
    } catch {
        // ignore cancellation issues
    }
};

const requestContentType = async (url: URL, init: RequestInit) => {
    if (!isRemoteProtocol(url.protocol)) {
        return { contentType: null, status: null };
    }
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (controller) {
        timeoutId = setTimeout(() => controller.abort(), REMOTE_CHECK_TIMEOUT_MS);
    }
    try {
        const response = await fetch(url.href, {
            cache: "no-store",
            credentials: "include",
            redirect: "follow",
            ...init,
            signal: controller?.signal,
        });
        await stopResponseBody(response);
        return { contentType: response.headers.get("content-type"), status: response.status };
    } catch {
        return { contentType: null, status: null };
    } finally {
        if (typeof timeoutId !== "undefined") {
            clearTimeout(timeoutId);
        }
    }
};

const fetchRemoteContentType = async (url: URL): Promise<string | null> => {
    const primary = await requestContentType(url, { method: "HEAD" });
    if (primary.contentType) return primary.contentType;
    if (primary.status && (primary.status === 405 || primary.status === 501)) {
        const fallback = await requestContentType(url, {
            method: "GET",
            headers: { Range: "bytes=0-1023" },
        });
        return fallback.contentType;
    }
    return primary.contentType;
};

const isProbablyMarkdownResponse = async (url: URL) => {
    if (!isRemoteProtocol(url.protocol)) return true;
    const cacheKey = `${url.origin}${url.pathname}${url.search}`;
    if (REMOTE_NATURE_CACHE.has(cacheKey)) {
        return REMOTE_NATURE_CACHE.get(cacheKey) as boolean;
    }
    if (REMOTE_PENDING_CHECKS.has(cacheKey)) {
        return REMOTE_PENDING_CHECKS.get(cacheKey) as Promise<boolean>;
    }
    const pending = (async () => {
        const contentType = await fetchRemoteContentType(url);
        const result = !isHtmlOrXmlContentType(contentType);
        REMOTE_NATURE_CACHE.set(cacheKey, result);
        REMOTE_PENDING_CHECKS.delete(cacheKey);
        return result;
    })();
    REMOTE_PENDING_CHECKS.set(cacheKey, pending);
    return pending;
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
    try {
        const parsed = new URL(url);
        void isProbablyMarkdownResponse(parsed).then((shouldOpen) => {
            if (shouldOpen) {
                openViewer(url, tabId);
            }
        });
    } catch {
        openViewer(url, tabId);
    }
});
