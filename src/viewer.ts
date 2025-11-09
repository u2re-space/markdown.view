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

