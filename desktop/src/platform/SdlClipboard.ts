import { clipboard } from "@kmamal/sdl"
import type { ClipboardPort } from "@game/core"

/** The clipboard of the system, through SDL, which reads and writes it at once. */
export class SdlClipboard implements ClipboardPort {


    async read(): Promise<string> {
        return clipboard.text
    }

    async write(text: string): Promise<void> {
        clipboard.setText(text)
    }
}
