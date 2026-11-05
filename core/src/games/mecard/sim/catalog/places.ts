import type { Place, PlaceInfo, PlaceKind } from "../run/Journey"

import { HALT_TYPES } from "./halts"

/** What the players are told of each kind of place: of the fights here, of a halt by its sort. */
export const PLACE_INFOS: Readonly<Record<PlaceKind, PlaceInfo>> = {
    battle: { name: "Combat", description: "Des monstres. Une récompense et de l'or si tu gagnes." },
    elite: { name: "Élite", description: "Des monstres plus nombreux. Une meilleure récompense, plus d'or." },
    boss: { name: "Boss", description: "Le gardien de l'étage. Le vaincre ouvre ses sorties." },
    ...HALT_TYPES,
}

/** What the players are told of a place: of the floor it leads to for an exit, else of its kind. */
export function infoOf(place: Place): PlaceInfo {
    return place.exitTo?.type ?? PLACE_INFOS[place.kind]
}
