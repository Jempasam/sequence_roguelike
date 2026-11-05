/** Changes on every build, so browsers refetch assets after a release. Injected by Vite (`define`). */
declare const BUILD_ID: string

/**
 * The keyboard layout map of Chromium, missing from lib.dom.
 *
 * @see https://developer.mozilla.org/docs/Web/API/Keyboard/getLayoutMap
 */
interface Navigator {
    readonly keyboard?: { getLayoutMap(): Promise<ReadonlyMap<string, string>> }
}
