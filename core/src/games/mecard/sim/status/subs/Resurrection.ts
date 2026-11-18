import type { Text } from "../../../../../semantic"
import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { Heart } from "../../heart/Heart"
import { BLUE_HEART } from "../../heart/subs/BlueHeartKind"
import { RoundStatus } from "../RoundStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"

/** How many hearts a resurrection heals, before the blue one it gives. */
export const RESURRECTION_HEAL = 1

/** A resurrection: death is undone once. */
export const RESURRECTED = new StatusType("résurrection", statusVisual("resurrection", 1, 0.9, 0.4), "positive", level => new Resurrection(level), {
    description: [
        "Si l'unité meurt pendant ", STATUS_LEVEL, " rounds, elle revient avec ", RESURRECTION_HEAL,
        " cœur soigné et un cœur bleu. Ne sert qu'une fois.",
    ],
})

/** Bring a unit back from the death it just met: a heart healed, a blue heart given. */
export function revive({ battle, unit }: UnitContext): void {
    unit.hearts.heal(RESURRECTION_HEAL)
    unit.hearts.give(new Heart(BLUE_HEART))
    battle.events.push({ type: "status", unit, text: ["revient à la vie"] })
}

/**
 * Resurrection: for as many rounds as its level, what would kill its unit does not. It stands again with a
 * heart healed and a blue one, and the status is gone. Only a death by a wound counts: what slays outright,
 * an explosion of its own, a sacrifice, stays dead.
 */
export class Resurrection extends RoundStatus {


    public readonly type: StatusType = RESURRECTED

    public override toSemString(): Text { return [RESURRECTED, ` ${this.level}`] }

    /** Bring the unit back, and spend the status. */
    private spend(ctx: UnitContext): void {
        ctx.battle.signals.notifyStatus.notify({ unit: ctx.unit, target: this })
        revive(ctx)
        ctx.battle.removeStatus(ctx.unit, this.type)
    }

    protected plug(ctx: UnitContext): Observer[] {
        return [ctx.unit.hearts.onEmptied.add(() => this.spend(ctx))]
    }
}
