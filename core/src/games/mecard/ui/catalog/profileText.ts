import type { CardMeasure, ProfileRow } from "../../sim/analysis"

/** What each profile is called to the player. */
const PROFILE_NAMES: Readonly<Record<string, string>> = {
    run: "course",
    bite: "morsure",
    guard: "garde",
    aim: "visée",
    support: "soutien",
    filler: "remplissage",
    main: "principale",
}

/** What each thing a card did alone is called to the player. */
const MEASURE_NAMES: Readonly<Record<string, string>> = {
    moved: "déplacement",
    turned: "rotation",
    damage: "dégâts",
    healed: "soin",
    shield: "bouclier",
    summoned: "invocations",
}

/** What a profile is called to the player. */
export function profileName(id: string): string {
    return PROFILE_NAMES[id] ?? id
}

/** What a card did played alone, as a line: `déplacement 2.0, dégâts 1.0`, none when it did nothing seen. */
export function measureLine(measure: CardMeasure|null): string {
    if(!measure) return "aucun effet vu seule"
    const seen = Object.entries(measure).filter(([, amount]) => amount > 0)
    return seen.map(([key, amount]) => `${MEASURE_NAMES[key] ?? key} ${amount.toFixed(1)}`).join(", ")
}

/** How a card was read, as a line: `Avancer : course (déplacement 2.0)`. */
export function profileText({ card, profile, measure }: ProfileRow): string {
    const done = measure ? measureLine(measure) : ""
    return `${card.name} : ${profileName(profile.id)}${done === "" ? "" : ` (${done})`}`
}
