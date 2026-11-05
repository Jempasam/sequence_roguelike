import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/** The folder of the game in the data folder of the user. NOTE: waits for the name of the game. */
const APP_DIRECTORY = "Roguelike"

/**
 * The folder the files shipped with the game are read from. In the release, assets/ sits next to the
 * bundle, whether it runs as main.cjs or injected in the executable. In dev, this file is run from
 * desktop/src/, and the assets are the repo's.
 */
export function assetsDirectory(): string {
    // The bundle turns import.meta.url into the URL of __filename, which a SEA sets to the executable.
    const here = dirname(fileURLToPath(import.meta.url))
    return import.meta.env.DEV ? resolve(here, "..", "..", "assets") : join(here, "assets")
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
