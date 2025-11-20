import { provide } from "fest/lure";
import "./index.scss"

const DEFAULT_STORAGE_KEY = "$cached-md$";
const DEFAULT_CACHE_URI = "/user/cache/last.md";

type Nullable<T> = T | null | undefined;

export interface ViewerOptions {
    initialSrc?: Nullable<string>;
    storage?: Storage | null;
    storageKey?: string | null;
    cacheUri?: string | null;
    enableDrop?: boolean;
    target?: HTMLElement | null;
    onFileDrop?: (file: File, objectUrl: string) => void;
    onResolvedCache?: (objectUrl: string) => void;
}

export interface ViewerController {
    readonly element: HTMLElement | null;
    readonly currentObjectURL: string | null;
    setSource(nextSrc: string): void;
    setMarkdown(markdown: string, mimeType?: string): void;
}

const toBlobUrl = (source: BlobPart, type = "text/markdown"): string => {
    return URL.createObjectURL(new Blob([source], { type }));
};

const isLikelyUrl = (text: string) => {
    try {
        const url = new URL(text);
        return ["http:", "https:"].includes(url.protocol);
    } catch {
        return false;
    }
};

export function setupViewer(options: ViewerOptions = {}): ViewerController {
    const {
        target = document.querySelector<HTMLElement>("md-view"),
        storage = typeof localStorage !== "undefined" ? localStorage : null,
        storageKey = DEFAULT_STORAGE_KEY,
        cacheUri = DEFAULT_CACHE_URI,
        enableDrop = true,
        initialSrc,
        onFileDrop,
        onResolvedCache,
    } = options;

    let objectUrl: string | null = null;

    const applySource = (src: Nullable<string>) => {
        const value = src?.trim?.();
        if (value) {
            target?.setAttribute("src", value);
        }
    };

    const setObjectUrl = (source: Blob | BlobPart, mimeType = "text/markdown", apply = true) => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = toBlobUrl(source, mimeType);
        if (apply) {
            applySource(objectUrl);
        }
        return objectUrl;
    };

    // Initial source preference: provided src -> existing attribute -> cached value.
    const existingAttribute = target?.getAttribute?.("src") ?? "";
    const cachedText = storageKey && storage ? storage.getItem(storageKey) ?? "" : "";
    if (initialSrc) {
        applySource(initialSrc);
    } else if (existingAttribute.trim()) {
        applySource(existingAttribute);
    } else if (cachedText) {
        objectUrl = setObjectUrl(cachedText, "text/plain");
    }

    if (navigator.storage && cacheUri) {
        provide(cacheUri)
            ?.then?.(async (descriptor) => {
                const content = await descriptor;
                if (!content) return;
                const hasSource = Boolean(target?.getAttribute?.("src")?.trim?.());
                const url = setObjectUrl(content, "text/markdown", !hasSource);
                onResolvedCache?.(url);
            })
            ?.catch?.((error) => console.debug("[markdown-view] cache load failed", error));
    }

    if (enableDrop) {
        const zone = target ?? document.body;

        // File Input for click-to-open
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".md,.markdown,.txt,text/markdown,text/plain";
        fileInput.style.display = "none";
        document.body.appendChild(fileInput);

        fileInput.addEventListener("change", () => {
            const file = fileInput.files?.[0];
            if (!file) return;
            const url = setObjectUrl(file, file.type || "text/markdown");
            onFileDrop?.(file, url);
            fileInput.value = ""; // Reset
        });

        zone.addEventListener("click", (event) => {
            // Only open if no content is currently displayed (heuristic: no src attribute or empty one)
            // or if the user explicitly wants to replace (maybe add a check for that later, but requirement says "if none of markdown content")
            // We check if the target has a src attribute.
            const currentSrc = target?.getAttribute("src");
            if (!currentSrc || currentSrc.trim() === "") {
                fileInput.click();
            }
        });

        zone.addEventListener("dragover", (event) => event.preventDefault(), { passive: false });
        zone.addEventListener(
            "drop",
            (event) => {
                event.preventDefault();
                const file = event.dataTransfer?.files?.item?.(0);
                if (!file) return;
                const url = setObjectUrl(file, file.type || "text/markdown");
                onFileDrop?.(file, url);
            },
            { passive: false },
        );

        // Paste handling
        document.addEventListener("paste", (event) => {
            const items = event.clipboardData?.items;
            if (!items) return;

            // 1. Check for File
            for (let i = 0; i < items.length; i++) {
                if (items[i].kind === "file") {
                    const file = items[i].getAsFile();
                    if (file) {
                        const url = setObjectUrl(file, file.type || "text/markdown");
                        onFileDrop?.(file, url);
                        return; // Stop after first file
                    }
                }
            }

            // 2. Check for Text (URL or Content)
            const text = event.clipboardData?.getData("text");
            if (text) {
                if (isLikelyUrl(text)) {
                    applySource(text);
                } else {
                    setObjectUrl(text, "text/markdown");
                }
            }
        });
    }

    return {
        element: target ?? null,
        get currentObjectURL() {
            return objectUrl;
        },
        setSource(nextSrc: string) {
            applySource(nextSrc);
        },
        setMarkdown(markdown: string, mimeType = "text/markdown") {
            setObjectUrl(markdown, mimeType);
        },
    };
}
