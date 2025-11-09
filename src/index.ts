/*import "./scss/markdown/github-markdown.scss"
import "./scss/markdown/github-markdown-dark.scss"
import "./scss/markdown/github-markdown-light.scss"
import "./scss/print/Print.scss"*/
import { MarkdownView } from "fest/fl-ui";
import { setupViewer } from "./viewer";

//
console.log(MarkdownView);

//
import "./index.scss"

//
const initialSrc = new URL(window.location.href).searchParams.get("src") ?? undefined;
const viewer = setupViewer({ initialSrc });

addEventListener("message", (event) => {
    const src = event?.data?.src?.trim?.() || "";
    if (!src) return;
    viewer.setSource(src);
});
