import { visual } from "../../base/Visual"
import type { PlugContext } from "../../battle/Action"
import type { Battle } from "../../battle/Battle"
import type { Unit } from "../../battle/Unit"
import { Heart } from "../../heart/Heart"
import { RED_HEART } from "../../heart/subs/RedHeartKind"
import { AbstractProcess } from "../AbstractProcess"

/** The bodies made by {@link stuffed}. */
const STUFFED_BODIES = new WeakSet<Unit>()

/** Is a unit a body stuffed from an enemy that fell? */
export function isStuffed(unit: Unit): boolean {
    return STUFFED_BODIES.has(unit)
}

/**
 * Make a body of a unit that died, for an owner: stuffed, it has half the hearts of the dead and plays its
 * cards each round, from the place it fell, as a summon of the owner.
 *
 * @returns The body, none when there was no room.
 */
export function stuffed(battle: Battle, owner: Unit, dead: Unit): Unit|null {
    const cards = [
        ...dead.decks.all.flatMap(deck => [...deck.pile, ...deck.discard]), ...dead.hand, ...dead.chain.cards,
    ]
    const kind = dead.hearts.all[0]?.kind ?? RED_HEART
    const body = battle.place(owner, {
        name: `${dead.name} empaillé`, sprite: dead.sprite, at: dead.position, direction: dead.direction,
        hearts: Heart.many(kind, Math.max(1, Math.floor(dead.hearts.all.length / 2))), size: dead.stats.size.value, cards,
    })
    if(body) STUFFED_BODIES.add(body)
    return body
}

/** What a process of the next kill does with the enemy killed, once: the process is armed until it kills. */
function onNextKill({ unit, hold }: PlugContext, what: (dead: Unit) => void): void {
    let armed = true
    hold(unit.killed.add(({ unit: dead }) => {
        if(!armed || dead.team === unit.team) return
        armed = false
        what(dead)
    }))
}

/** A stuffing: the next enemy the unit kills this round is stuffed, and fights for the unit for the battle. */
export class Stuffing extends AbstractProcess {


    constructor(){
        super("empaillage", visual("processes/taxidermy", { color: [0.75, 0.6, 0.4] }),
            "La prochaine unité ennemie que tu tues ce round est empaillée : elle combat pour toi avec la moitié de ses cœurs.",
        )
    }


    public override init(ctx: PlugContext): void {
        onNextKill(ctx, dead => stuffed(ctx.battle, ctx.unit, dead))
    }
}

/** A taming: the next enemy the unit kills this round joins its team for good, once the battle is won. */
export class Taming extends AbstractProcess {


    constructor(){
        super("dressage", visual("processes/taming"),
            "La prochaine unité ennemie que tu tues ce round rejoint ton équipe pour de bon, si le combat est gagné.",
        )
    }


    public override init(ctx: PlugContext): void {
        onNextKill(ctx, dead => ctx.battle.captured.push(dead))
    }
}
