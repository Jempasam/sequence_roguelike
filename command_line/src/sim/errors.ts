/** A mistake in what the user typed: printed as it is, never with a stack, the exit code 1. */
export class UsageError extends Error {}

/** A text as it is compared: no case, no accent, spaces collapsed. */
export function normalize(text: string): string {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim()
}

/** How many edits turn a text into another. */
function distance(first: string, second: string): number {
    let previous = Array.from({ length: second.length + 1 }, (_, index) => index)
    for(let row = 1; row <= first.length; row++){
        const current = [row]
        for(let column = 1; column <= second.length; column++){
            const same = first[row - 1] === second[column - 1] ? 0 : 1
            current.push(Math.min(previous[column] + 1, current[column - 1] + 1, previous[column - 1] + same))
        }
        previous = current
    }
    return previous[second.length]
}

/** The candidates closest to a value, the closest first, at most `count`, none when nothing looks like it. */
export function closest(value: string, candidates: readonly string[], count = 3): string[] {
    const wanted = normalize(value)
    const limit = Math.max(2, Math.floor(wanted.length / 2))
    return candidates
        .map(candidate => {
            const known = normalize(candidate)
            const near = known.includes(wanted) || wanted.includes(known) ? 1 : distance(wanted, known)
            return { candidate, near }
        })
        .filter(({ near }) => near <= limit)
        .sort((first, second) => first.near - second.near)
        .slice(0, count)
        .map(({ candidate }) => candidate)
}

/** How many names an error lists at most when nothing looks like the value. */
const LISTED = 12

/** `« Lancer »` is not known: what was meant, or what exists. */
export function unknownName(what: string, value: string, candidates: readonly string[]): UsageError {
    const near = closest(value, candidates)
    const hint = near.length > 0
        ? `Vouliez-vous ${near.map(name => `« ${name} »`).join(", ")} ?`
        : `Disponibles : ${candidates.slice(0, LISTED).join(", ")}${candidates.length > LISTED ? ", …" : ""}.`
    return new UsageError(`Nom inconnu « ${value} » (${what}). ${hint}`)
}
