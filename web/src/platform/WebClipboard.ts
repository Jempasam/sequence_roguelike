import type { ClipboardPort } from "@game/core"

/**
 * The clipboard of the browser, `navigator.clipboard`. It works only in a secure context, and the browser
 * may ask for a permission or a gesture of the user: a refusal rejects, and the text field reports it.
 */
export class WebClipboard implements ClipboardPort {


    constructor(clipboard: Clipboard|undefined){
        this.#clipboard = clipboard ?? null
    }


    read(): Promise<string> {
        if(!this.#clipboard) return Promise.reject(new Error("The browser gives no clipboard outside a secure context."))
        return this.#clipboard.readText()
    }

    write(text: string): Promise<void> {
        if(!this.#clipboard) return Promise.reject(new Error("The browser gives no clipboard outside a secure context."))
        return this.#clipboard.writeText(text)
    }


    readonly #clipboard: Clipboard|null
}
