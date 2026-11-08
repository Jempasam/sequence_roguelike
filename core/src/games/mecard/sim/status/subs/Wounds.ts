import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import type { Vector2 } from "../../base/Vector2"
import type { Unit } from "../../battle/Unit"
import { RoundStatus } from "../RoundStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"

/** A bleeding: each move hurts. */
export const BLEEDING = new StatusType("saignement", statusVisual("bleeding", 0.8, 0.05, 0.1), "negative", level => new Bleeding(level), { description: ["Perd exactement un cœur à chaque déplacement, par lui-même ou subi, pendant ", STATUS_LEVEL, " rounds."] })

/** How many hearts each move of a bleeding unit takes. */
export const BLEEDING_DAMAGE = 1

/** Bleeding: each time it moves, on its own or moved by another, it loses exactly a heart. */
export class Bleeding extends RoundStatus {


    public readonly type: StatusType = BLEEDING

    protected plug({ battle, unit }: UnitContext): Observer[] {
        // Told once per whole move, a glide of many strides being one: a step costs one heart, not one per tick.
        const bleed = (event: { unit: Unit, from: { position: Vector2 }, to: { position: Vector2 } }): void => {
            if(event.unit !== unit || event.from.position.equals(event.to.position)) return
            battle.signals.notifyStatus.notify({ unit, status: this })
            unit.hearts.damage(BLEEDING_DAMAGE, "physical", null)
        }
        return [battle.signals.moved.add(bleed), battle.signals.blinked.add(bleed)]
    }
}

/** A mark: the next attack that hurts the unit hurts twice as much. */
export const MARKED = new StatusType("marque", statusVisual("mark", 1, 0.85, 0.2), "negative", level => new Mark(level), { description: ["La prochaine blessure d'une attaque est doublée, puis la marque disparaît. Dure au plus ", STATUS_LEVEL, " rounds."] })

/** Marked: the next wound of an attack is doubled, then the mark is gone. */
export class Mark extends RoundStatus {


    public readonly type: StatusType = MARKED

    protected plug({ battle, unit }: UnitContext): Observer[] {
        return [unit.hearts.onIncoming.add(incoming => {
            if(incoming.derived || !incoming.source || incoming.amount <= 0) return
            incoming.amount *= 2
            battle.signals.notifyStatus.notify({ unit, status: this })
            battle.removeStatus(unit, MARKED)
        })]
    }
}

/** A fragility: each blow takes more. */
export const FRAGILE = new StatusType("fragilité", statusVisual("fragile", 0.75, 0.75, 0.85), "negative", level => new Fragility(level), { description: ["Chaque blessure prend un cœur de plus, pendant ", STATUS_LEVEL, " rounds."] })

/** How many hearts more each wound of a fragile unit takes. */
export const FRAGILITY_DAMAGE = 1

/** Fragile: each wound takes a heart more. */
export class Fragility extends RoundStatus {


    public readonly type: StatusType = FRAGILE

    protected plug({ battle, unit }: UnitContext): Observer[] {
        return [unit.hearts.onIncoming.add(incoming => {
            if(incoming.derived || incoming.amount <= 0) return
            battle.signals.notifyStatus.notify({ unit, status: this })
            incoming.amount += FRAGILITY_DAMAGE
        })]
    }
}

/** A bond of souls: what wounds one of the bound wounds the others. */
export const SOUL_LINKED = new StatusType("lien d'âme", statusVisual("soul_link", 0.7, 0.55, 1), "neutral", level => new SoulLink(level), { description: ["Chaque blessure est répétée à l'identique aux autres unités liées, sans écho en retour, pendant ", STATUS_LEVEL, " rounds."] })

/** The units of a battle holding a status of a kind, the living ones. */
function holding(unit: Unit, type: StatusType): Unit[] {
    return unit.battle.units.filter(other => other.alive && other.statuses.has(type))
}

/** Linked: each wound of the unit is echoed in the same amount to the other linked units, echoing nothing in turn. */
export class SoulLink extends RoundStatus {


    public readonly type: StatusType = SOUL_LINKED

    protected plug({ battle, unit }: UnitContext): Observer[] {
        return [unit.hearts.onDamage.add(({ amount, nature, source }) => {
            battle.signals.notifyStatus.notify({ unit, status: this })
            for(const other of holding(unit, SOUL_LINKED)) if(other !== unit) other.hearts.echo(amount, nature, source)
        })]
    }
}

/** A shield of souls: what wounds one of the bound is shared among all of them. */
export const SOUL_SHIELDED = new StatusType("bouclier d'âme", statusVisual("soul_shield", 0.5, 0.75, 1), "positive", level => new SoulShield(level), { description: ["Une blessure est partagée entre les unités protégées : la plus touchée en prend la plus grosse part, les autres un écho chacune, pendant ", STATUS_LEVEL, " rounds."] })

/** Shielded: a wound is cut among the shielded units, the unit taking the largest share, the others an echo each. */
export class SoulShield extends RoundStatus {


    public readonly type: StatusType = SOUL_SHIELDED

    protected plug({ battle, unit }: UnitContext): Observer[] {
        return [unit.hearts.onIncoming.add(incoming => {
            if(incoming.derived || incoming.amount <= 0) return
            const bound = holding(unit, SOUL_SHIELDED)
            if(bound.length < 2) return
            battle.signals.notifyStatus.notify({ unit, status: this })
            const total = incoming.amount
            const share = Math.floor(total / bound.length)
            incoming.amount = total - share * (bound.length - 1)
            if(share <= 0) return
            for(const other of bound) if(other !== unit) other.hearts.echo(share, incoming.nature, incoming.source)
        })]
    }
}
