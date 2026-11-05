import { Observable } from "../base/Observable"
import type { HealEvent, HeartEvent, HeartLossEvent, HeartReplaceEvent, HurtEvent, IncomingDamage, Nature } from "../battle/events"
import type { Unit } from "../battle/Unit"

import { Heart, insertHeart } from "./Heart"
import type { HeartDamage } from "./HeartDamage"
import type { HeartKind } from "./HeartKind"
import type { HeartRule } from "./HeartRule"

/**
 * How deep effects may set each other off, a wound leading to a wound. Two thorn hearts facing each other
 * would loop forever without it.
 */
export const MAX_EFFECT_DEPTH = 8

/** Where a heart stood in its bar before it was lost, and what took its place, if anything did. */
interface HeartPlace {
    readonly index: number
    readonly replacement: Heart|null
}

/**
 * The life bar of a unit: its hearts, the base life first, then the other kinds, lost first, from the last,
 * and the rules of each kind it holds. Whatever changes a heart in a battle goes through it.
 *
 * @remarks
 * It tells what happens through its own observables, which the battle forwards to whoever shows it, and it
 * plugs in and takes back the rules of the kinds as the bar changes. The hearts lost to a wound are told
 * apart from those lost otherwise: a wound shows itself, a heart going away on its own is looked at.
 */
export class Hearts {


    //// Triggers ////

    /** Damage is about to land: the listeners may lower it. */
    public readonly onIncoming: Observable<IncomingDamage>

    /** A wound landed: how many hearts it took. */
    public readonly onDamage: Observable<HurtEvent>

    /** Hearts were healed. */
    public readonly onHeal: Observable<HealEvent>

    /** A heart came into the bar, or an empty one was filled. */
    public readonly onAdd: Observable<HeartEvent>

    /** Hearts of a kind left the bar, outside of any wound. */
    public readonly onRemove: Observable<HeartLossEvent>

    /** Hearts of a kind left others in their place, outside of any wound. */
    public readonly onReplace: Observable<HeartReplaceEvent>

    /** A wound took hearts of a kind, which left the bar or left others in their place. */
    public readonly onWound: Observable<HeartLossEvent>


    //// State ////

    /** Every heart of the bar, the empty ones included, in order. */
    public readonly all: Heart[]

    /** The rules of each kind of heart the bar holds, one for each kind. */
    public readonly rules = new Map<HeartKind, HeartRule>()

    constructor(
        public readonly unit: Unit,

        /** Its hearts, copied: the battle never changes those it was given. */
        hearts: readonly Heart[],
    ){
        const { report } = unit.battle
        this.onIncoming = new Observable(report)
        this.onDamage = new Observable(report)
        this.onHeal = new Observable(report)
        this.onAdd = new Observable(report)
        this.onRemove = new Observable(report)
        this.onReplace = new Observable(report)
        this.onWound = new Observable(report)
        this.all = Heart.copies(hearts)
        for(const heart of this.all) this.ruleOf(heart)
    }


    /** How many hearts the bar holds, the empty ones included. */
    public get maxHearts(): number {
        return this.all.length
    }

    /** How many hearts of the bar leave an empty place once lost, the empty ones included. */
    public get maxKeptHearts(): number {
        return this.all.filter(heart => this.ruleOf(heart).onReplacement(heart) !== null).length
    }

    /** How many hearts of the bar are not empty. */
    public get hearts(): number {
        return this.all.filter(heart => !heart.isEmpty).length
    }

    /** Is no heart keeping the unit alive anymore? */
    public get isDead(): boolean {
        return !this.all.some(heart => this.ruleOf(heart).preventsDeath(heart))
    }

    /**
     * The rules of the kind of a heart in the bar, made when missing: they are plugged in, and taken back
     * when the bar holds no heart of the kind anymore.
     */
    public ruleOf(heart: Heart): HeartRule {
        let rule = this.rules.get(heart.kind)
        if(!rule){
            rule = heart.kind.create()
            this.rules.set(heart.kind, rule)
        }
        return rule
    }

    /** Plug in the rules of every kind the bar holds: the unit enters a battle going on. */
    public plug(): void {
        for(const rule of this.rules.values()) this.#init(rule)
    }

    /** Take back the rules of every kind the bar holds: the unit died, left, or the battle is over. */
    public unplug(): void {
        for(const rule of this.rules.values()) rule.remove()
    }

    /**
     * Wound the unit, through its protections, from its last heart.
     *
     * @returns How many hearts it lost.
     */
    public damage(amount: number, nature: Nature, source: Unit|null): number {
        const { unit } = this
        const { battle } = unit
        if(this.isDead) return 0
        if(battle.effectDepth >= MAX_EFFECT_DEPTH){
            battle.report(new Error(`Effects set each other off more than ${MAX_EFFECT_DEPTH} deep: the last was dropped.`))
            return 0
        }
        battle.effectDepth++
        try {
            const incoming = { target: unit, source, nature, amount }
            this.onIncoming.notify(incoming)
            if(incoming.amount <= 0){
                battle.events.push({ type: "dodged", unit })
                return 0
            }
            const lost = this.#take({ amount: incoming.amount, nature, source })
            battle.events.push({ type: "hurt", unit, amount: lost })
            this.onDamage.notify({ target: unit, source, nature, amount: lost })
            if(this.isDead) unit.die(source)
            return lost
        } finally {
            battle.effectDepth--
        }
    }

    /** Heal hearts one by one, the first one its kind heals each time, from the left. */
    public heal(amount: number): void {
        const { unit } = this
        let healed = 0
        while(healed < amount && this.#healOne()) healed++
        if(healed === 0) return
        unit.battle.events.push({ type: "healed", unit, amount: healed })
        this.onHeal.notify({ unit, amount: healed })
    }

    /** Give a heart, in its place in the bar: a heart of the base life before the other kinds. */
    public give(heart: Heart): void {
        const { unit } = this
        insertHeart(this.all, heart)
        this.onAdd.notify({ unit, heart, index: this.all.indexOf(heart) })
        this.#follow()
        unit.battle.events.push({ type: "status", unit, text: ["+ cœur ", heart.kind] })
    }

    /** Fill an empty heart again, as a heart coming back. Does nothing to a full one. */
    public restore(heart: Heart): void {
        const { unit } = this
        if(!heart.isEmpty || !this.all.includes(heart)) return
        heart.isEmpty = false
        unit.battle.events.push({ type: "healed", unit, amount: 1 })
        this.onAdd.notify({ unit, heart, index: this.all.indexOf(heart) })
        this.onHeal.notify({ unit, amount: 1 })
    }

    /**
     * Lose full hearts of a kind, from the last, outside of any wound: the rules of the kind may leave empty
     * places and act. The unit dies when nothing keeps it alive anymore.
     *
     * @param amount - How many, as many as the bar holds when it holds fewer.
     * @param source - Who they are lost to, none for nobody.
     * @returns How many hearts it lost.
     */
    public remove(kind: HeartKind, amount: number, source: Unit|null): number {
        const { unit } = this
        const full = this.all.filter(heart => heart.kind === kind && !heart.isEmpty)
        const hearts = full.reverse().slice(0, Math.max(0, amount))
        if(hearts.length === 0) return 0
        const wasAlive = !this.isDead
        this.#lose(hearts, source, places => {
            const removed: number[] = []
            const replaced: number[] = []
            const replacements: Heart[] = []
            for(const { index, replacement } of places){
                if(replacement){
                    replaced.push(index)
                    replacements.push(replacement)
                } else removed.push(index)
            }
            if(removed.length > 0) this.onRemove.notify({ unit, kind, indexes: removed })
            if(replaced.length > 0) this.onReplace.notify({ unit, kind, indexes: replaced, replacements })
        })
        unit.battle.events.push({ type: "hurt", unit, amount: hearts.length })
        if(wasAlive && this.isDead) unit.die(source)
        return hearts.length
    }

    /** Lose every heart keeping the unit alive, whatever its kind: what it takes to kill it. */
    public slay(source: Unit|null): void {
        while(!this.isDead){
            const heart = this.all.find(each => this.ruleOf(each).preventsDeath(each))
            if(!heart || this.remove(heart.kind, this.all.length, source) === 0) break
        }
    }


    /**
     * Wound the hearts kind by kind, from the last one a wound may target, the hearts of a kind that follow
     * each other lost together.
     *
     * @returns How many hearts it took.
     */
    #take(damage: HeartDamage): number {
        const { unit } = this
        let lost = 0
        while(damage.amount > 0){
            const hearts = this.#wounded(damage)
            if(hearts.length === 0) break
            lost += hearts.length
            const { kind } = hearts[0]
            this.#lose(hearts, damage.source, places => {
                this.onWound.notify({ unit, kind, indexes: places.map(({ index }) => index) })
            })
        }
        return lost
    }

    /**
     * The hearts a wound takes next, from the last one it may target, as long as they are of one kind. Each
     * counts in the wound; a heart refusing it blocks the rest of the wound.
     */
    #wounded(damage: HeartDamage): Heart[] {
        const hearts: Heart[] = []
        for(let index = this.all.length - 1; index >= 0 && damage.amount > 0; index--){
            const heart = this.all[index]
            const rule = this.ruleOf(heart)
            if(!rule.canBeTargeted(heart)) continue
            if(hearts.length > 0 && heart.kind !== hearts[0].kind) break
            if(!rule.doDamage(heart, damage)){
                damage.amount = 0
                break
            }
            damage.amount--
            hearts.push(heart)
        }
        return hearts
    }

    /**
     * Take hearts of one kind off the bar, each replacement in its place when the kind leaves one, then have
     * the rules of the kind act for each, and the rules of the bar follow.
     *
     * @param hearts - The hearts, at least one, the last of the bar first, so a place stays true once told.
     * @param tell - How it is told, given where each stood and what took its place.
     */
    #lose(hearts: readonly Heart[], source: Unit|null, tell: (places: readonly HeartPlace[]) => void): void {
        const { unit } = this
        const { battle } = unit
        const rule = this.ruleOf(hearts[0])
        const places = hearts.map(heart => {
            const index = this.all.indexOf(heart)
            const replacement = rule.onReplacement(heart)
            if(replacement) this.all[index] = replacement
            else this.all.splice(index, 1)
            return { index, replacement }
        })
        tell(places)
        for(const heart of hearts){
            try {
                rule.onLost({ battle, unit, heart, source })
            } catch(error){
                battle.report(error)
            }
        }
        this.#follow()
    }

    /** Heal the first heart its kind heals, from the left, saying whether one was. */
    #healOne(): boolean {
        return this.all.some(heart => this.ruleOf(heart).heal(heart))
    }

    /**
     * Have the rules follow the bar: those of a kind it holds no heart of anymore taken back, those of a kind
     * newly held plugged in, while the unit stands in a battle going on.
     */
    #follow(): void {
        const { unit } = this
        const { battle } = unit
        const kinds = new Set(this.all.map(heart => heart.kind))
        for(const [kind, rule] of [...this.rules]){
            if(kinds.has(kind)) continue
            rule.remove()
            this.rules.delete(kind)
        }
        const plugging = !this.isDead && battle.phase !== "over" && battle.units.includes(unit)
        for(const heart of this.all){
            if(this.rules.has(heart.kind)) continue
            const rule = this.ruleOf(heart)
            if(plugging) this.#init(rule)
        }
    }

    /** Plug the rules of a kind in, an error reported rather than thrown. */
    #init(rule: HeartRule): void {
        const { unit } = this
        const { battle } = unit
        try {
            rule.init({ battle, unit })
        } catch(error){
            battle.report(error)
        }
    }
}
