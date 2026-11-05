/**
 * The files shipped with the game, read only. The adapter only moves bytes: decoding happens in core, so
 * both platforms give the same result.
 *
 * @remarks
 * The path is a plain string here, typed as an `AssetPath` one level up, in `engine/assets`. The port
 * naming that type would make the ports depend on the engine, which depends on them.
 */
export interface AssetsPort {
    /**
     * Read the bytes of a file shipped with the game.
     *
     * @param path - The path of the file under assets/, `/`-separated and lowercase.
     * @throws {@link Error} When the file cannot be read, naming it.
     */
    read(path: string): Promise<Uint8Array>
}
