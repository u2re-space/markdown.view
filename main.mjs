/*import "./scss/markdown/github-markdown.scss"
import "./scss/markdown/github-markdown-dark.scss"
import "./scss/markdown/github-markdown-light.scss"
import "./scss/print/Print.scss"*/
import "./scss/main.scss"
import "./js/Markdown.mjs"

//
addEventListener("message", (ev)=>{
    const markdown = document?.querySelector?.("md-view");
    const src = ev?.data?.src?.trim?.() || "";
    if (src && !src?.endsWith?.(".html") && !src?.endsWith?.("/")) {
        if (markdown) { markdown.setAttribute("src", ev?.data?.src || markdown.getAttribute("src") || ""); };
    }
});
