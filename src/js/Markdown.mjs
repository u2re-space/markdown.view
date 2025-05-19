// @ts-ignore
import styles from "../scss/markdown.scss?inline&compress";
import { marked } from "marked";
import DOMPurify from 'isomorphic-dompurify';

// @ts-ignore /* @vite-ignore */
import { E, H } from "/externals/modules/blue.js";

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
export const provide = async (req = "", rw = false) => {
    const url = (req)?.url ?? req;
    const path = getDir(url?.replace?.(location.origin, "")?.trim?.());
    const fn   = url?.split("/")?.at?.(-1);

    //
    if (!URL.canParse(url) && path?.trim()?.startsWith?.("/user") && navigator?.storage) {
        const fs = await useFS();
        const $path = path?.replace?.("/user/", "")?.trim?.();
        const clean = (($path?.split?.("/") || [$path])?.filter?.((p)=>!!p?.trim?.()) || [""])?.join?.("/") || "";
        const npt = ((clean && clean != "/") ? "/" + clean + "/" : clean) || "/";

        //
        if (npt && npt != "/") { await fs?.mkdir?.(npt); };
        if (rw) {
            return {
                write(data) {
                    return fs?.writeFile?.(npt + fn, data);
                }
            }
        }

        //
        const handle = await fs?.readFile?.(npt + fn, {encoding: "blob"});

        //
        let file = null;
        try { file = handle?.unwrap?.() ?? handle; } catch(e) {};
        return file;
    } else {
        return fetch(req).then(async (r) => {
            const blob = await r.blob();
            const lastModified = Date.parse(r.headers.get("Last-Modified") || "") || 0;
            return new File([blob], url.substring(url.lastIndexOf('/') + 1), {
                type: blob.type,
                lastModified
            });
        });
    }
    return null;
};

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
        if (file && navigator?.storage) { provide("/user/cache/last.md", true)?.write?.(file instanceof Response ? file?.blob?.() : file); } else
        { typeof file == "string" ? (localStorage.setItem("$cached-md$", file)) : file?.text?.()?.then?.((t)=>localStorage.setItem("$cached-md$", t)); }
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
