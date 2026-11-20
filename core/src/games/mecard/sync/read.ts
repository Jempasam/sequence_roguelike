import { UnreadableFault } from "./faults"

/**
 * What a text says as JSON, or why it is not JSON. Reading what came from the network never throws.
 *
 * @param topic - The topic the text came on, for the fault.
 */
export function readJson(topic: string, text: string): unknown|UnreadableFault {
    try {
        return JSON.parse(text) as unknown
    } catch(error){
        return new UnreadableFault(topic, text, detailOf(error))
    }
}

/** What a failure of the simulation says, as text. */
export function detailOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

/** The fault of a text that is JSON, but not what the topic says: the other client may not be up to date. */
export function wrongShape(topic: string, text: string, what: string): UnreadableFault {
    return new UnreadableFault(topic, text, `it is no ${what}: is the other client up to date?`)
}

/** The fault of a text of another version of a save. */
export function wrongVersion(topic: string, text: string, theirs: unknown, ours: number): UnreadableFault {
    const version = typeof theirs === "number" ? String(theirs) : "none"
    return new UnreadableFault(topic, text, `the other client saves in version ${version}, this one in ${ours}.`)
}
