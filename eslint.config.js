import stylistic from "@stylistic/eslint-plugin"
import globals from "globals"
import tseslint from "typescript-eslint"

// Environment globals core must reach through its Platform ports. lib.dom stays on for the WebGL types,
// so the compiler alone would let them through.
const CORE_FORBIDDEN_GLOBALS = [
    "window", "document", "navigator", "fetch", "localStorage", "sessionStorage", "indexedDB",
    "requestAnimationFrame", "cancelAnimationFrame", "process", "Buffer", "require",
    "setTimeout", "setInterval", "setImmediate", "performance", "WebSocket", "RTCPeerConnection",
].map(name => ({ name, message: "core reaches its environment through Platform only." }))

const NO_EM_DASH = { selector: "Literal[value=/\\u2014/]", message: "No em dash." }

export default tseslint.config(
    { ignores: ["**/dist/**", "**/node_modules/**", ".generated/**"] },
    ...tseslint.configs.recommended,
    {
        plugins: { "@stylistic": stylistic },
        rules: {
            "@stylistic/indent": ["error", 4],
            "@stylistic/semi": ["error", "never"],
            "@stylistic/quotes": ["error", "double", { avoidEscape: true, allowTemplateLiterals: "avoidEscape" }],
            "@stylistic/keyword-spacing": ["error", {
                overrides: {
                    if: { after: false }, for: { after: false }, while: { after: false },
                    switch: { after: false }, catch: { after: false },
                },
            }],
            "@stylistic/space-before-blocks": ["error", { functions: "off", keywords: "off", classes: "always" }],
            "@stylistic/space-before-function-paren": ["error", "never"],
            "@stylistic/comma-dangle": ["error", "always-multiline"],
            "@stylistic/max-len": ["error", { code: 110, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
            "no-irregular-whitespace": "error",
            "no-restricted-syntax": ["error", NO_EM_DASH],
            "@typescript-eslint/no-empty-function": "off",
        },
    },
    {
        // core/build is the tooling that compiles core, and runs in Node at build time.
        files: ["core/**/*.ts"],
        ignores: ["core/build/**"],
        rules: {
            "no-restricted-globals": ["error", ...CORE_FORBIDDEN_GLOBALS],
        },
    },
    {
        // The server is a program of its own: core reaches only its protocol, which is plain TypeScript.
        files: ["core/**/*.ts"],
        rules: {
            "no-restricted-imports": ["error", { patterns: [{
                regex: "^@game/server(?!/protocol$)",
                message: "core reaches the server through @game/server/protocol only.",
            }] }],
        },
    },
    {
        // The protocol is imported by core, which runs in a browser too: no Node, no ws.
        files: ["server/src/protocol/**/*.ts"],
        rules: {
            "no-restricted-imports": ["error", { patterns: [{
                group: ["node:*", "ws"],
                message: "The protocol is plain TypeScript, shared with core.",
            }] }],
        },
    },
    {
        // engine/gpu is the only layer calling gl.*. The ports declare the context they hand over.
        files: ["core/**/*.ts"],
        ignores: ["core/build/**", "core/src/engine/gpu/**", "core/src/platform/**"],
        rules: {
            "no-restricted-syntax": ["error", NO_EM_DASH, {
                selector: "TSTypeReference[typeName.name=/^WebGL/]",
                message: "Only engine/gpu touches WebGL. Draw through its Painter.",
            }],
        },
    },
    {
        files: ["core/src/sim/**/*.ts", "core/src/games/*/sim/**/*.ts"],
        rules: {
            "no-restricted-properties": ["error",
                { object: "Math", property: "random", message: "sim draws from the seeded RNG in its state." },
                { object: "Date", property: "now", message: "sim only knows the tick count." },
            ],
        },
    },
    {
        files: ["**/*.mjs", "**/vite.config.ts", "eslint.config.js", "vitest.config.ts"],
        languageOptions: { globals: globals.node },
    },
)
