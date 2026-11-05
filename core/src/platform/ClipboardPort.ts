/**
 * The clipboard of the system, which text fields copy to and paste from.
 *
 * @remarks
 * Asynchronous, since the web one is, and may refuse: the browser asks for a gesture of the user, or for a
 * permission. A refusal rejects, and the caller reports it rather than ignoring it.
 */
export interface ClipboardPort {
    /** The text the clipboard holds, empty when it holds none. */
    read(): Promise<string>

    /** Put a text in the clipboard. */
    write(text: string): Promise<void>
}
