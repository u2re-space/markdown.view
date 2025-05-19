/*import "./scss/markdown/github-markdown.scss"
import "./scss/markdown/github-markdown-dark.scss"
import "./scss/markdown/github-markdown-light.scss"
import "./scss/print/Print.scss"*/
import "./src/scss/main.scss"
import { provide } from "./src/js/Markdown.mjs"

//
let last = URL.createObjectURL(new Blob([localStorage.getItem("$cached-md$") || ""], {type: "plain/text"}));
let doc = document.querySelector("md-view");
doc?.setAttribute?.("src", doc?.getAttribute?.("src") || last);

//
(navigator.storage ? provide("/user/cache/last.md") : null)?.then?.((b)=>{
    doc ??= document.querySelector("md-view"); last = URL.createObjectURL(b);
    doc?.setAttribute?.("src", doc?.getAttribute?.("src") || last);
});

//
const zone = (document.querySelector("md-view") || document.body);
zone.addEventListener("dragover", (ev)=>{ ev.preventDefault(); });
zone.addEventListener("drop", (ev) => {
    ev.preventDefault();
    const drop = ev.target.matches("md-view") ? ev.target : document.querySelector("md-view");
    const url  = (ev.dataTransfer.files.length > 0 ? URL.createObjectURL(ev.dataTransfer.files[0]) : last) || "";
    if (url) { drop.setAttribute("src", url || drop.getAttribute("src") || ""); };
});
