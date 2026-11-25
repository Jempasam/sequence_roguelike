import type { HistoryEntry } from "../../sim/save/historySave"

/** How the games of the history are ordered. */
export type SortMode = "recent"|"deepest"|"richest"

/** A record a game holds among the games of the history. */
export type Medal = "deepest"|"richest"

/** How far a game went, to compare: its floor, then the row it fell on. */
function reach(entry: HistoryEntry): number {
    return (entry.floorNumber ?? entry.depth) * 1000 + (entry.route?.fallAt ?? 0)
}

/**
 * The games ordered, the filter kept: those that fell on the floor of that name, all of them for none. The
 * recent ones come first as the games are given, the others by what their mode compares, the recent first
 * among equals.
 */
export function sortedAndFiltered(
    entries: readonly HistoryEntry[], mode: SortMode, floor: string|null,
): readonly HistoryEntry[] {
    const kept = floor === null ? [...entries] : entries.filter(entry => entry.floor === floor)
    if(mode === "deepest") return kept.sort((a, b) => reach(b) - reach(a))
    if(mode === "richest") return kept.sort((a, b) => b.gold - a.gold)
    return kept
}

/** The medals of each game, by the game: the deepest one and the richest, the oldest keeping a tie. */
export function medalsOf(entries: readonly HistoryEntry[]): ReadonlyMap<HistoryEntry, readonly Medal[]> {
    const medals = new Map<HistoryEntry, Medal[]>()
    const award = (entry: HistoryEntry, medal: Medal): void => {
        medals.set(entry, [...medals.get(entry) ?? [], medal])
    }
    const oldestFirst = [...entries].sort((a, b) => a.date - b.date)
    let deepest: HistoryEntry|null = null
    let richest: HistoryEntry|null = null
    for(const entry of oldestFirst){
        if(!deepest || reach(entry) > reach(deepest)) deepest = entry
        if(!richest || entry.gold > richest.gold) richest = entry
    }
    if(deepest) award(deepest, "deepest")
    if(richest) award(richest, "richest")
    return medals
}

/** What a medal is called. */
export function medalName(medal: Medal): string {
    return medal === "deepest" ? "Plus profonde" : "Plus riche"
}
