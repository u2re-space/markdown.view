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

//
const zone = (document.querySelector("md-view") || document.body);
zone.addEventListener("dragover", (ev)=>{ ev.preventDefault(); });
zone.addEventListener("drop", (ev) => {
    ev.preventDefault();
    const drop = ev.target.matches("md-view") ? ev.target : document.querySelector("md-view");
    const url  = ev.dataTransfer.files.length > 0 ? URL.createObjectURL(ev.dataTransfer.files[0]) : "";
    if (url) { drop.setAttribute("src", url || drop.getAttribute("src") || ""); };
});
