import { NOTE_COLOR } from "../../../battle/previewColors"
import { Heart } from "../../../heart/Heart"
import { BLUE_HEART } from "../../../heart/subs/BlueHeartKind"
import { SOLID_HEART } from "../../../heart/subs/SolidHeartKind"
import { SpiritAnchor } from "../../../process/subs/SpiritAnchor"
import { meters } from "../../../battle/words"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { label, still } from "../tools/previews"
import { Rarity } from "../../Rarity"
import { visual } from "../../../base/Visual"

/** How far ahead the spirit of a projection appears, in meters. */
const PROJECTION_AHEAD = 1

export const SPIRIT_ANCHOR = new ActionCard("Ancre spirituelle", [
    "Laisse un esprit intouchable là où tu es. En fin de round, tu te téléportes sur lui, tourné comme lui, ",
    "et il disparaît.",
], Rarity.RARE, {
    use: function* ({ battle, unit }){
        const spirit = battle.place(unit, {
            sprite: visual("units/spirit"), name: "Esprit", at: unit.position, direction: unit.direction,
            hearts: [new Heart(SOLID_HEART)], tangible: false, targetable: false, touchable: false, movable: false,
        })
        if(spirit) battle.startProcess(unit, new SpiritAnchor(spirit))
        yield* hold(battle, SHORT_TIME, [label(unit.position, "ancre", NOTE_COLOR)])
    },
    preview: ({ pose }) => still(pose, label(pose.position, "ancre", NOTE_COLOR)),
})

export const SPIRIT_PROJECTION = new ActionCard("Projection spirituelle", [
    "Invoque à ", meters(PROJECTION_AHEAD), " devant toi un esprit d'un cœur bleu, qui joue les cartes qui ",
    "suivent dans ta chaîne. Tu ne les joues pas : elles vont à la défausse.",
], Rarity.EPIC, {
    use: function* ({ battle, unit }){
        const cards = battle.cutChain(unit, unit.chain.cursor)
        if(cards.length > 0){
            battle.place(unit, {
                sprite: visual("units/spirit"), name: "Esprit projeté",
                at: unit.position.plus(unit.direction.times(PROJECTION_AHEAD)), direction: unit.direction,
                hearts: [new Heart(BLUE_HEART)], cards,
            })
        }
        yield* hold(battle, SHORT_TIME, [label(unit.position, "projection", NOTE_COLOR)])
    },
    preview: ({ pose }) => still(pose, label(pose.position, "projection", NOTE_COLOR)),
})
