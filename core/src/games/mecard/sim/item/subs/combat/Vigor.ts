import { Add, ModifierKey } from "../../../base/Attribute"
import { UNIT } from "../../../base/keywords"
import type { PlugContext } from "../../../battle/Action"
import { meters } from "../../../battle/words"
import { Heart } from "../../../heart/Heart"
import { BLACK_HEART } from "../../../heart/subs/BlackHeartKind"
import { BLUE_HEART } from "../../../heart/subs/BlueHeartKind"
import { GLASS_HEART } from "../../../heart/subs/GlassHeartKind"
import { RoundStatus } from "../../../status/RoundStatus"

import { AbstractItem } from "../AbstractItem"
import { visual } from "../../../base/Visual"

/** How many glass hearts the glass heart gives, and how far around the reactor wounds. */
const GLASS_HEARTS = 2
const REACTOR_RADIUS = 1

/** How much gold a glove gives for each kill. */
const GLOVE_GOLD = 2

/** An hourglass: the positive statuses of its unit lose a round only every other round. */
export class Hourglass extends AbstractItem {


    constructor(){
        super("Sablier", visual("items/bottle_bag"), [
            "Ses status positifs ne perdent un round qu'un round sur deux.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        // Plugged before the statuses of the battle, so what it gives back comes before their count down. The
        // rounds it spares are told by the number of the round, not by a count of its own, which a save would lose.
        hold(battle.roundEnded.add(round => {
            if(round % 2 !== 1) return
            for(const status of [...unit.statuses.values()]){
                if(!(status instanceof RoundStatus) || status.type.polarity !== "positive") continue
                battle.applyStatus(unit, status.type, 1)
            }
        }))
    }
}

export const HOURGLASS = new Hourglass()

/** A glass heart: hearts of glass at the start of the battle. */
export class GlassCore extends AbstractItem {


    constructor(){
        super("Cœur de verre", visual("items/amulet"), ["Début du combat : gagne ", String(GLASS_HEARTS), " cœurs de verre."])
    }


    public init({ unit }: PlugContext): void {
        for(const heart of Heart.many(GLASS_HEART, GLASS_HEARTS)) unit.hearts.give(heart)
    }
}

export const GLASS_CORE = new GlassCore()

/** An unstable reactor: losing a blue or black heart wounds the units around. */
export class UnstableReactor extends AbstractItem {


    constructor(){
        super("Réacteur instable", visual("items/alembic"), [
            "Quand il perd un cœur bleu ou noir : un cœur de dégât à chaque ", UNIT, " à ", meters(REACTOR_RADIUS), " autour.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        const burst = ({ kind }: { kind: unknown }): void => {
            if(kind !== BLUE_HEART && kind !== BLACK_HEART) return
            battle.strike(unit, { kind: "circle", center: unit.position, radius: REACTOR_RADIUS }, 1, "physical")
        }
        hold(unit.hearts.onRemove.add(burst))
        hold(unit.hearts.onWound.add(burst))
        hold(unit.hearts.onReplace.add(burst))
    }
}

export const UNSTABLE_REACTOR = new UnstableReactor()

/** A blood pact: a point of strength for each heart missing. */
export class BloodPact extends AbstractItem {


    constructor(){
        super("Pacte de sang", visual("items/fang"), ["+1 force par cœur manquant."])
    }


    public init({ unit, hold }: PlugContext): void {
        const key = new ModifierKey("pacte de sang")
        const refresh = (): void => unit.stats.strength.add(key, new Add(unit.missing))
        refresh()
        const { hearts } = unit
        for(const heard of [hearts.onDamage, hearts.onEcho, hearts.onHeal, hearts.onAdd, hearts.onRemove, hearts.onReplace]){
            hold(heard.add(refresh))
        }
        hold(() => unit.stats.strength.remove(key))
    }
}

export const BLOOD_PACT = new BloodPact()

/** An echo: the last step of the chain plays twice. */
export class EchoItem extends AbstractItem {


    constructor(){
        super("Écho", visual("items/spyglass"), ["À la fin de la préparation, la dernière étape de la chaîne est jouée deux fois."])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.prepEnded.add(() => {
            if(unit.alive) battle.duplicateLastStep(unit)
        }))
    }
}

export const ECHO_ITEM = new EchoItem()

/** A fisher's glove: each kill gives gold. */
export class FisherGlove extends AbstractItem {


    constructor(){
        super("Gant de pêcheur", visual("items/satchel"), ["Chaque ", UNIT, " tuée donne ", String(GLOVE_GOLD), " or."])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(unit.killed.add(() => battle.giveGold(unit, GLOVE_GOLD)))
    }
}

export const FISHER_GLOVE = new FisherGlove()
