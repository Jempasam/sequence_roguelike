import { Keyword } from "../../../../../semantic"
import { Forced, ModifierKey } from "../../base/Attribute"
import type { Observer } from "../../base/Observable"
import { visual } from "../../base/Visual"
import type { UnitContext } from "../../battle/Action"
import type { Unit } from "../../battle/Unit"
import { BaseStatus } from "../BaseStatus"
import { RoundStatus } from "../RoundStatus"
import { ScalingStatus } from "../ScalingStatus"
import type { StatGain } from "../ScalingStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"

/** The keyword of a bubble: a body of time that copies the actions of its blower. */
export const BULLE = new Keyword("bulle")

/** The level a bubble is born at, and the one an orange bubble is born at. */
export const BUBBLE_START = 3
export const BUBBLE_ORANGE_START = 5

/** The level a bubble must hold to copy an action, and what a copy costs it. */
export const BUBBLE_COPY_LEVEL = 3
export const BUBBLE_COPY_COST = 2

/** How near an unit with soapiness must be to command the bubbles of others, in meters. */
export const SOAPY_REACH = 1

/** The look of the link between a bubble and what can control it. */
const LINK = visual("tethers/laser", { color: [0.6, 0.85, 1] })

/** A bubble: what makes a body one, with everything a bubble is. */
export const BUBBLE = new StatusType("bulle", statusVisual("bubble", 0.6, 0.85, 1), "neutral", level => new BubbleStatus(level), {
    description: [
        "Ne peut pas être ciblée. Chaque action jouée lui donne 1 niveau (", STATUS_LEVEL, "). Éclate dès qu'elle touche une ",
        "unité, ou qu'une unité la touche, une fois son action en cours résolue.",
    ],
})

/**
 * A bubble: a body nobody aims at, whose level is its energy, up by one at each step it plays, and which bursts
 * the moment it touches a unit or is touched by one, its action in progress resolved first.
 */
export class BubbleStatus extends BaseStatus {


    public readonly type: StatusType = BUBBLE

    public init({ battle, unit }: UnitContext): void {
        unit.stats.targetable.add(this.#key, new Forced(false))
        this.keep(
            unit.stepStarted.add(() => { this.#playing = true }),
            unit.stepEnded.add(() => {
                this.#playing = false
                this.setLevel(this.level + 1)
                if(this.#doomed) this.#burst(unit)
            }),
            battle.signals.collided.add(({ unit: mover, struck }) => {
                if(mover !== unit && struck !== unit) return
                this.#doomed = true
                if(!this.#playing) this.#burst(unit)
            }),
        )
    }

    public remove(ctx?: UnitContext): void {
        ctx?.unit.stats.targetable.remove(this.#key)
        this.letGo()
    }


    readonly #key = new ModifierKey("bulle")
    #playing = false
    #doomed = false

    /** Burst: lose every heart, however many it was alive by. */
    #burst(unit: Unit): void {
        this.#doomed = false
        if(unit.alive) unit.hearts.slay(null)
    }
}

/** Does a unit hold the status of a bubble? */
export function isBubble(unit: Unit): boolean {
    return unit.statuses.has(BUBBLE)
}

/** The soapiness: what lets a unit command the bubbles around, its bubbles first. */
export const SOAPY = new StatusType("savonneux", statusVisual("soapy", 0.75, 0.9, 1), "positive", level => new Soapy(level), {
    description: [
        "Chaque action jouée est copiée au bout de la chaîne de tes ", BULLE, " de niveau ", BUBBLE_COPY_LEVEL, " ou plus, ",
        "et par les autres à moins de ", SOAPY_REACH, " m : elles perdent ", BUBBLE_COPY_COST, " niveaux. Encore ", STATUS_LEVEL, " rounds.",
    ],
})

/**
 * Soapy: each action its unit plays is copied by the bubbles it commands, its own wherever they are and the
 * others near it, which each pay for it. Each commanded bubble is tied to it by a link, drawn while it lasts.
 */
export class Soapy extends RoundStatus {


    public readonly type: StatusType = SOAPY

    protected plug(ctx: UnitContext): Observer[] {
        const { battle, unit } = ctx
        const relink = (): void => this.#relink(ctx)
        relink()
        return [
            unit.stepStarted.add(() => this.#copy(ctx)),
            battle.signals.moved.add(relink),
            battle.signals.spawned.add(relink),
            battle.signals.statusAdded.add(relink),
            battle.signals.statusRemoved.add(relink),
            { remove: () => this.#unlink() },
        ]
    }


    readonly #links = new Map<Unit, { release: () => void, watch: Observer }>()

    /** Can the unit command this unit, a bubble? */
    #commands(unit: Unit, bubble: Unit): boolean {
        if(bubble === unit || !bubble.alive || !isBubble(bubble)) return false
        return bubble.owner === unit || unit.position.distance(bubble.position) <= SOAPY_REACH
    }

    /** Copy the cards just started to the end of the chain of the bubbles that can, that pay for it. */
    #copy({ battle, unit }: UnitContext): void {
        if(unit.lastTree.length === 0) return
        for(const bubble of battle.living){
            const held = bubble.statusOf(BUBBLE)
            if(!held || held.level < BUBBLE_COPY_LEVEL || !this.#commands(unit, bubble)) continue
            battle.appendToChain(bubble, [...unit.lastTree])
            battle.applyStatus(bubble, BUBBLE, -BUBBLE_COPY_COST)
            battle.events.push({ type: "status", unit: bubble, text: "copie" })
        }
    }

    /** Make the links those of the bubbles it commands now. */
    #relink({ battle, unit }: UnitContext): void {
        const commanded = new Set(unit.alive ? battle.living.filter(bubble => this.#commands(unit, bubble)) : [])
        for(const [bubble, link] of this.#links){
            if(commanded.has(bubble)) continue
            this.#drop(bubble, link)
        }
        for(const bubble of commanded){
            if(this.#links.has(bubble)) continue
            const release = battle.tether(unit, bubble, LINK)
            const watch = bubble.onDeath.add(() => {
                const link = this.#links.get(bubble)
                if(link) this.#drop(bubble, link)
            })
            this.#links.set(bubble, { release, watch })
        }
    }

    #drop(bubble: Unit, link: { release: () => void, watch: Observer }): void {
        link.watch.remove()
        link.release()
        this.#links.delete(bubble)
    }

    #unlink(): void {
        for(const [bubble, link] of [...this.#links]) this.#drop(bubble, link)
    }
}

/** A giant: more strength and reach, less speed, for as long as its level lasts. */
export const GIANT = new StatusType("géant", statusVisual("giant", 1, 0.75, 0.4), "positive", level => new Giant(level), {
    description: ["+1 force, +1 portée, +1 allonge, −0,5 mouvement. Encore ", STATUS_LEVEL, " rounds."],
})

/** Giant: fixed gains, for as many rounds as its level. */
export class Giant extends ScalingStatus {


    public readonly type: StatusType = GIANT

    protected gains(level: number): readonly StatGain[] {
        const on = level > 0 ? 1 : 0
        return [
            { stat: stats => stats.strength, amount: on },
            { stat: stats => stats.throwRange, amount: on },
            { stat: stats => stats.meleeRange, amount: on },
            { stat: stats => stats.move, amount: -0.5 * on },
        ]
    }
}
