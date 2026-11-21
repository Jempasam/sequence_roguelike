import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"
import type { Unit } from "../../../battle/Unit"
import type { Card } from "../../../card/Card"
import { Heart } from "../../../heart/Heart"

import { AbstractItem } from "../AbstractItem"

/** What a body was made of when it came, which its copy is made of again. */
interface Blueprint {
    readonly hearts: readonly Heart[]
    readonly cards: readonly Card[]
}

/**
 * Nesting dolls: a body its unit summoned that dies leaves a smaller copy of itself, with half its hearts,
 * down to none. The copy is a summon in its turn, so it leaves a smaller one when it dies.
 */
export class NestingDolls extends AbstractItem {


    constructor(){
        super("Poupées russes", visual("items/nesting_dolls"), [
            "Quand une de tes invocations meurt, elle laisse une copie d'elle-même avec la moitié de ses cœurs.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        const blueprints = new WeakMap<Unit, Blueprint>()
        hold(battle.signals.spawned.add(({ unit: body }) => {
            if(body.owner !== unit) return
            blueprints.set(body, {
                hearts: Heart.copies(body.hearts.all),
                cards: body.decks.all.flatMap(deck => [...deck.pile]),
            })
        }))
        hold(battle.unitDied.add(({ unit: dead }) => {
            const blueprint = blueprints.get(dead)
            if(!blueprint || dead.owner !== unit) return
            const kept = Math.floor(blueprint.hearts.length / 2)
            if(kept < 1) return
            battle.place(unit, {
                name: dead.name, sprite: dead.sprite, at: dead.position, direction: dead.direction,
                hearts: blueprint.hearts.slice(0, kept).map(heart => new Heart(heart.kind)), size: dead.stats.size.value,
                cards: blueprint.cards,
            })
        }))
    }
}

export const NESTING_DOLLS = new NestingDolls()
