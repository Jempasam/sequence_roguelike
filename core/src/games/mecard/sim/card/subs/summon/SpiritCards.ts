import { NOTE_COLOR } from "../../../battle/previewColors"
import { HeartCount } from "../../../battle/words"
import { Heart } from "../../../heart/Heart"
import { BLUE_HEART } from "../../../heart/subs/BlueHeartKind"
import { SOLID_HEART } from "../../../heart/subs/SolidHeartKind"
import { SpiritAnchor } from "../../../process/subs/SpiritAnchor"
import { DISTANCE, BATTLE_ROUND } from "../../../base/keywords"
import { INVOCATION } from "../../../battle/mecanic/summon/keyword"
import { SUMMON_AHEAD } from "../../../battle/mecanic/summon/summon"
import { TELEPORT } from "../../../battle/mecanic/teleport/keyword"
import { TURN } from "../../../battle/mecanic/turn/keyword"
import * as Summons from "../../../battle/mecanic/summon"

import { ActionCard } from "../ActionCard"
import { MergedCard } from "../composite/MergedCard"
import { RAM } from "../movement/Ram"
import { hold, SHORT_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import { visual } from "../../../base/Visual"
import * as Previews from "../../../battle/preview/Previews"

export const SPIRIT_ANCHOR = new ActionCard("Ancre spirituelle", [
    "Laisse un esprit intouchable là où tu es. En fin de ", BATTLE_ROUND, ", tu ", TELEPORT.as("te téléportes"), " sur lui, ",
    TURN.as("tourné"), " comme lui, et il disparaît.",
], Rarity.RARE, {
    use: function ({ battle, unit }){
        const spirit = battle.place(unit, {
            sprite: visual("units/spirit"), name: "Esprit", at: unit.position, direction: unit.direction,
            hearts: [new Heart(SOLID_HEART)], tangible: false, targetable: false, touchable: false, movable: false,
        })
        if(spirit) battle.startProcess(unit, new SpiritAnchor(spirit))
        hold(battle, SHORT_TIME, [Previews.label(unit.position, "ancre", NOTE_COLOR)])
    },
    preview: ({ pose }) => Previews.still(pose, Previews.label(pose.position, "ancre", NOTE_COLOR)),
})

export const SPIRIT_PROJECTION = new ActionCard("Projection spirituelle", [
    INVOCATION.as("Invoque"), " à ", SUMMON_AHEAD, " ", DISTANCE, " devant toi un esprit d'", new HeartCount(1), " ", BLUE_HEART, ", qui joue les cartes qui ",
    "suivent dans ta chaîne. Tu ne les joues pas : elles vont à la défausse.",
], Rarity.EPIC, {
    use: function ({ battle, unit }){
        const cards = battle.cutChain(unit, unit.chain.cursor)
        if(cards.length > 0){
            Summons.summonAt(battle, unit, [Summons.summonSpot(unit, unit)], {
                sprite: visual("units/spirit"), name: "Esprit projeté", hearts: () => [new Heart(BLUE_HEART)], cards,
            })
        }
        hold(battle, SHORT_TIME, [Previews.label(unit.position, "projection", NOTE_COLOR)])
    },
    preview: ({ battle, unit, pose }) => {
        return Previews.still(pose, ...Summons.summonShows(battle, unit, [Summons.summonSpot(unit, pose)]))
    },
})

/** An anchor left behind and a ram at once. */
export const SPIRIT_DASH = new MergedCard([SPIRIT_ANCHOR, RAM], { name: "Dash spirituel", rarity: Rarity.LEGENDARY })
