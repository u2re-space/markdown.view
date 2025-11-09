import { MarkdownView } from "fest/fl-ui";
import { setupViewer } from "../viewer";
import "../index.scss";

console.log(MarkdownView);

const params = new URL(window.location.href).searchParams;
const initialSrcParam = params.get("src");
const initialSrc = initialSrcParam ? decodeURIComponent(initialSrcParam) : undefined;

const viewer = setupViewer({ initialSrc });

if (typeof chrome !== "undefined" && chrome?.runtime?.id) {
    try {
        chrome.runtime.onMessage?.addListener?.((message: any, _sender: any, sendResponse: (payload?: unknown) => void) => {
            if (message?.markdown) {
                viewer.setMarkdown(message.markdown, message.mimeType ?? "text/markdown");
                sendResponse?.({ ok: true });
                return;
            }
            if (message?.src) {
                viewer.setSource(message.src);
                sendResponse?.({ ok: true });
            }
        });
    } catch (error) {
        console.warn("[markdown-view] Unable to attach chrome message listener", error);
    }
}

