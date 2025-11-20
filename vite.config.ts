import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { defineConfig } from "vite";
import compression from 'vite-plugin-compression2';
import cssnano from "cssnano";
import deduplicate from "postcss-discard-duplicates";
import postcssPresetEnv from 'postcss-preset-env';
import autoprefixer from "autoprefixer";
import { viteStaticCopy } from "vite-plugin-static-copy";
import https from "./https/certificate.mjs";


//
function normalizeAliasPattern(pattern) {
    return pattern.replace(/\/\*+$/, '');
}

//
const importFromTSConfig = (tsconfig, __dirname) => {
    const paths = tsconfig?.compilerOptions?.paths || {};
    const alias = [];
    for (const key in paths) {
        const normalizedKey = normalizeAliasPattern(key);
        const target = paths[key]?.at?.(0);
        const normalizedTarget = normalizeAliasPattern(target);
        alias.push({
            find: normalizedKey,
            replacement: resolve(__dirname, normalizedTarget),
        });
    }
    return alias;
};


//
export const initiate = (NAME = "markdown-view", tsconfig = {}, __dirname = resolve(import.meta.dirname, "./"))=>{
    const $resolve = {
        alias: importFromTSConfig(tsconfig, __dirname)
    }

    //
    const terserOptions = {
        ecma: 2020,
        keep_classnames: false,
        keep_fnames: false,
        module: true,
        toplevel: true,
        mangle: {
            eval: true,
            keep_classnames: false,
            keep_fnames: false,
            module: true,
            toplevel: true,
            properties: {
                builtins: true,
                keep_quoted: "strict",
                undeclared: true,
                only_annotated: true,
                reserved: ["register", "resolve", "reject", "undefined"]
            }
        },
        compress: {
            ecma: 2020,
            keep_classnames: false,
            keep_fnames: false,
            keep_infinity: false,
            reduce_vars: true,
            reduce_funcs: true,
            pure_funcs: [],
            arguments: true,
            expression: true,
            inline: 3,
            module: true,
            passes: 3,
            side_effects: true,
            pure_getters: true,
            typeofs: true,
            toplevel: true,
            unsafe: true,
            unsafe_Function: true,
            unsafe_comps: true,
            unsafe_arrows: true,
            unsafe_math: true,
            unsafe_symbols: true,
            unsafe_undefined: true,
            unsafe_methods: true,
            unsafe_regexp: true,
            unsafe_proto: true,
            warnings: true,
            unused: true,
            booleans_as_integers: true,
            hoist_funs: true,
            hoist_vars: true,
            properties: true,
            // don't use in debug mode
            //drop_console: true
        },
        format: {
            braces: false,
            comments: false,
            ecma: 2020,
            //indent_level: 0,
            semicolons: true,
            shebang: true,
            inline_script: true,
            quote_style: 0,
            wrap_iife: true,
            ascii_only: true,
        }
    };

    //
    const plugins = [
        compression(),
    ];

    //
    const rollupOptions = {
        treeshake: 'smallest',
        input: "./src/index.ts",
        output: {
            compact: true,
            globals: {},
            format: 'es',
            name: NAME,
            dir: './dist',
            exports: "auto",
            minifyInternalExports: true,
            experimentalMinChunkSize: 500_500,
        }
    };

    //
    const css = {
        postcss: {
            plugins: [
                deduplicate(),
                autoprefixer(),
                cssnano({
                    preset: ['advanced', {
                        calc: false,
                        layer: false,
                        scope: false,
                        discardComments: {
                            removeAll: true
                        }
                }],
            }), postcssPresetEnv({
                features: { 'nesting-rules': false },
                stage: 0
            })],
        },
    }

    //
    const optimizeDeps = {
        include: [
            "./node_modules/**/*.mjs",
            "./node_modules/**/*.js",
            "./node_modules/**/*.ts",
            "./src/**/*.mjs",
            "./src/**/*.js",
            "./src/**/*.ts",
            "./src/*.mjs",
            "./src/*.js",
            "./src/*.ts",
            "./test/*.mjs",
            "./test/*.js",
            "./test/*.ts"
        ],
        entries: [resolve(__dirname, './src/index.ts')],
        force: true
    }

    //
    const server = {
        port: 5173,
        open: false,
        origin: "http://localhost:5173",
        allowedHosts: ['localhost', '127.0.0.1', '0.0.0.0', '192.168.0.200', '95.188.82.223'],
        appType: 'spa',
        fs: {
            allow: ['..', resolve(__dirname, '../') ]
        },
    };

    //
    const build = {
        emptyOutDir: false,
        chunkSizeWarningLimit: 1600,
        assetsInlineLimit: 1024 * 1024,
        minify: false,///"terser",
        sourcemap: 'hidden',
        target: "esnext",
        rollupOptions,
        terserOptions,
        name: NAME,
        lib: {
            formats: ["es"],
            entry: resolve(__dirname, './src/index.ts')?.toString?.(),
            name: NAME,
            fileName: NAME,
        },
    }

    //
    return {resolve: $resolve, rollupOptions, plugins, build, css, optimizeDeps, server};
}

//
const objectAssign = (target, ...sources) => {
    if (!sources.length) return target;

    const source = sources.shift();
    if (source && typeof source === 'object') {
        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                if (source[key] && typeof source[key] === 'object') {
                    if (!target[key] || typeof target[key] !== 'object') {
                        target[key] = Array.isArray(source[key]) ? [] : {};
                    }
                    objectAssign(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
    }

    return objectAssign(target, ...sources);
}

//
const NAME = "markdown-view";
export const __dirname = resolve(import.meta.dirname, "./");
const loadTSConfig = async () => JSON.parse(await readFile(resolve(__dirname, "./tsconfig.json"), { encoding: "utf8" }));

const flattenExtensionOutput = () => ({
    name: "markdown-view:flatten-extension-output",
    enforce: "post" as const,
    generateBundle(_options, bundle) {
        for (const key of Object.keys(bundle)) {
            const output = bundle[key];
            if (!output?.fileName?.startsWith?.("extension/")) continue;
            const nextFileName = output.fileName.slice("extension/".length);
            if (output.type === "asset" && typeof output.source === "string") {
                output.source = output.source.replace(/\.\.\/assets\//g, "assets/");
            }
            output.fileName = nextFileName || output.fileName;
        }
    },
});

const applyServerDefaults = (configuration) => objectAssign(configuration, {
    base: "./",
    server: {
        origin: "",
        host: "0.0.0.0",
        port: 443,
        https,
        cors: {
            allowedHeaders: "*",
            preflightContinue: true,
            credentials: true,
            methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
            origin: "*"
        },
        headers: {
            "Accept-Language": "*",
            "Content-Security-Policy": "upgrade-insecure-requests",
            "Content-Language": "*",
            "Service-Worker-Allowed": "/",
            "Permissions-Policy": "fullscreen=*, window-management=*",
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Request-Headers": "*"
        }
    },
});

export default defineConfig(async ({ mode }) => {
    const tsconfig = await loadTSConfig();
    const isExtension = mode === "extension";
    const config = initiate(isExtension ? `${NAME}-extension` : NAME, tsconfig, __dirname);
    const plugins = [...(config.plugins ?? [])];

    /*const copyTargets = [
        { src: resolve(__dirname, "./fest"), dest: "fest" },
    ];*/

    //
    const copyTargets = [];
    if (isExtension) {
        copyTargets.push({ src: resolve(__dirname, "./extension/manifest.json"), dest: "." });
        copyTargets.push({ src: resolve(__dirname, "./extension/content.js"), dest: "." });
        copyTargets.push({ src: resolve(__dirname, "./extension/upsertFix.js"), dest: "." });
        copyTargets.push({ src: resolve(__dirname, "./extension/512x.png"), dest: "." });
        plugins.push(flattenExtensionOutput());
    }

    //
    if (copyTargets.length > 0) {
        const cp = viteStaticCopy({ targets: copyTargets });
        if (Array.isArray(cp)) {
            plugins.push(...cp);
        } else {
            plugins.push(cp);
        }
    }

    objectAssign(config, {
        plugins,
        publicDir: false,
    });

    if (config.build?.lib) {
        delete config.build.lib;
    }

    if (isExtension) {
        objectAssign(config, {
            optimizeDeps: objectAssign(config.optimizeDeps ?? {}, {
                entries: [
                    resolve(__dirname, "./extension/background.ts"),
                    resolve(__dirname, "./src/extension/index.ts"),
                ],
            }),
            build: objectAssign(config.build ?? {}, {
                outDir: resolve(__dirname, "./dist/extension"),
                rollupOptions: objectAssign(config.build?.rollupOptions ?? {}, {
                    input: {
                        background: resolve(__dirname, "./extension/background.ts"),
                        viewer: resolve(__dirname, "./extension/viewer.html"),
                    },
                    output: objectAssign(config.build?.rollupOptions?.output ?? {}, {
                        dir: resolve(__dirname, "./dist/extension"),
                        entryFileNames: (chunk) => (chunk.name === "background" ? "background.js" : "assets/[name]-[hash].js"),
                        chunkFileNames: "assets/[name]-[hash].js",
                        assetFileNames: "assets/[name]-[hash][extname]",
                    }),
                }),
            }),
        });

        return applyServerDefaults(config);
    }

    objectAssign(config, {
        optimizeDeps: objectAssign(config.optimizeDeps ?? {}, {
            entries: [resolve(__dirname, "./src/index.ts")],
        }),
        build: objectAssign(config.build ?? {}, {
            outDir: resolve(__dirname, "./dist/standalone"),
            rollupOptions: objectAssign(config.build?.rollupOptions ?? {}, {
                input: {
                    standalone: resolve(__dirname, "./index.html"),
                },
                output: objectAssign(config.build?.rollupOptions?.output ?? {}, {
                    dir: resolve(__dirname, "./dist/standalone"),
                }),
            }),
        }),
    });

    return applyServerDefaults(config);
});
