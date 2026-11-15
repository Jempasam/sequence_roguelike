import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/** The folder of the game in the data folder of the user. NOTE: waits for the name of the game. */
const APP_DIRECTORY = "Roguelike"

/**
 * The folders the files shipped with the game are read from, seen as one. In the release, assets/ sits next
 * to the bundle, whether it runs as main.cjs or injected in the executable, and holds both. In dev, this
 * file is run from desktop/src/, and they are the repo's assets/ and generated_assets/.
 */
export function assetsDirectories(): string[] {
    // The bundle turns import.meta.url into the URL of __filename, which a SEA sets to the executable.
    const here = dirname(fileURLToPath(import.meta.url))
    if(!import.meta.env.DEV) return [join(here, "assets")]
    return [resolve(here, "..", "..", "assets"), resolve(here, "..", "..", "generated_assets")]
}

/** The folder the data of the player is kept in, in the data folder of the user. */
export function saveDirectory(): string {
    return join(userDataDirectory(), APP_DIRECTORY)
}

function userDataDirectory(): string {
    switch(process.platform){
        case "win32": {
            const appData = process.env.APPDATA
            if(!appData) throw new Error("APPDATA is not set, so the saves have nowhere to go.")
            return appData
        }
        case "darwin":
            return join(homedir(), "Library", "Application Support")
        default:
            return process.env.XDG_DATA_HOME || join(homedir(), ".local", "share")
    }
}
