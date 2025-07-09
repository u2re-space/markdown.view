// @ts-ignore
import styles from "./Markdown.scss?inline&compress";
import DOMPurify from 'isomorphic-dompurify';
import { marked } from "marked";

//
import { E, H, provide } from "fest/lure";

//
const $useFS$ = async() => {
    // @ts-ignore
    const opfs = await import(/*@vite-ignore */ '/externals/vendor/happy-opfs.mjs').catch(console.warn.bind(console));

    // @ts-ignore
    const deno = typeof Deno != "undefined" ? Deno : null;

    /* @vite-ignore */
    const ignore = "" + "";
    /* @vite-ignore */
    let node = null;

    //
    const fs = opfs?.isOPFSSupported?.() ? opfs : (deno ?? node ?? opfs);
    return fs;
}

//
export const getDir = (dest)=>{
    if (typeof dest != "string") return dest;

    //
    dest = dest?.trim?.() || dest;
    if (!dest?.endsWith?.("/")) { dest = dest?.trim?.()?.split?.("/")?.slice(0, -1)?.join?.("/")?.trim?.() || dest; };
    const p1 = !dest?.trim()?.endsWith("/") ? (dest+"/") : dest;
    return (!p1?.startsWith("/") ? ("/"+p1) : p1);
}

//
let currentFS = null;
export const useFS = ()=>{ return (currentFS ??= $useFS$()); };

//
const preInit = URL.createObjectURL(new Blob([styles], {type: "text/css"}));
export class MarkdownView extends HTMLElement {
    static observedAttributes = ["src"];

    //
    constructor() { super(); this.createShadowRoot(); }

    //
    #view;
    #themeStyle;

    //
    async setHTML(doc = "") {
        let once = false;
        const view = this.#view?.element;
        const html = H(DOMPurify?.sanitize?.(await doc || "") || view?.innerHTML || "");
        if (view) {
            view.innerHTML = ``;
            view.append(html);
        }
        if (!once) document.dispatchEvent(new CustomEvent("ext-ready", {}));
        once = true;
    }

    //
    renderMarkdown(file) {
        typeof file == "string" ? (localStorage.setItem("$cached-md$", file)) : file?.text?.()?.then?.((t)=>localStorage.setItem("$cached-md$", t));
        if (file && navigator?.storage) { provide("/user/cache/last.md", true)?.write?.(file instanceof Response ? file?.blob?.() : file); }
        if (typeof file == "string") {
            this.setHTML(marked(file));
        } else
        if (file instanceof File || file instanceof Blob || file instanceof Response) {
            file?.text()?.then?.((doc)=>this.setHTML(marked(doc)));
        }
    }

    //
    attributeChangedCallback(name, oldValue) {
        const nv = this.getAttribute("src");
        if (nv && name == "src" && oldValue != nv) {
            provide(nv || "")?.then?.((file)=>this.renderMarkdown(file));
        };
    }

    //
    createShadowRoot() {
        const shadowRoot = this.attachShadow({ mode: "open" });
        shadowRoot.append((this.#view = E("div.markdown-body", { dataset: {print: ""} }))?.element);

        //
        const style = document.createElement("style");
        style.innerHTML = `@import url("${preInit}");`;
        shadowRoot.appendChild(style);

        //
        requestAnimationFrame(()=>{
            if (this.getAttribute("src")) {
                provide(this.getAttribute("src") || "")?.then?.((file)=>this.renderMarkdown(file));
            }
        });
    }
}

//
customElements.define("md-view", MarkdownView);
