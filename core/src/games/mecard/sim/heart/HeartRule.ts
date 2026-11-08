import type { Observer } from "../base/Observable"
import type { UnitContext } from "../battle/Action"
import type { HeartLostEvent } from "../battle/events"
import type { Unit } from "../battle/Unit"

import type { Heart } from "./Heart"
import type { HeartDamage } from "./HeartDamage"
import type { HeartKind } from "./HeartKind"

/**
 * The rules of a kind of heart in one life bar, made by its {@link HeartKind}: one for each kind a bar holds,
 * whatever the number of its hearts, so it keeps its own listeners and state, as a status does.
 *
 * @remarks
 * A battle plugs it in with {@link HeartRule.init} when the bar gets its first heart of the kind, and takes
 * it back with {@link HeartRule.remove} when the bar holds none anymore, when its unit dies, or when the
 * battle ends. A wound goes to the last heart of the bar that can be targeted: when that heart refuses it,
 * the rest of the wound is blocked.
 */
export class HeartRule {


    constructor(
        public readonly kind: HeartKind,
    ){}


    /** Plug its listeners in, for the unit of its bar. Nothing by default. */
    public init(ctx: UnitContext): void {
        void ctx
    }

    /** Take back every listener it holds. */
    public remove(): void {
        for(const observer of this.#held) observer.remove()
        this.#held.length = 0
    }

    /** May a wound reach this heart? Not when it is empty, by default: the wound goes to the one before. */
    public canBeTargeted(heart: Heart): boolean {
        return !heart.isEmpty
    }

    /** Does this heart take a wound reaching it? Yes by default; refusing blocks the rest of the wound. */
    public doDamage(heart: Heart, damage: HeartDamage): boolean {
        void heart
        void damage
        return true
    }

    /** Does this heart keep its unit alive? When it is not empty, by default. */
    public preventsDeath(heart: Heart): boolean {
        return !heart.isEmpty
    }

    /** What a heart of the kind does once lost. Nothing by default. */
    public onLost(event: HeartLostEvent): void {
        void event
    }

    /** What takes the place of a heart of the kind once lost, none to leave none, by default. */
    public onReplacement(heart: Heart): Heart|null {
        void heart
        return null
    }

    /** What the hearts of the kind do at the start of each battle, for the unit of their bar. Nothing by default. */
    public onBattleStart(ctx: UnitContext): void {
        void ctx
    }

    /** Heal this heart, saying whether it was. None is, by default. */
    public heal(heart: Heart): boolean {
        void heart
        return false
    }


    /** Keep a listener, taken back with the others by {@link HeartRule.remove}. */
    protected hold(observer: Observer): void {
        this.#held.push(observer)
    }

    /** The last heart of its kind in the bar of a unit that passes a test, none when none does. */
    protected lastOf(unit: Unit, test: (heart: Heart) => boolean = () => true): Heart|null {
        for(let index = unit.hearts.all.length - 1; index >= 0; index--){
            const heart = unit.hearts.all[index]
            if(heart.kind === this.kind && test(heart)) return heart
        }
        return null
    }

    /** Do something at the end of each round, until it is removed. */
    protected atRoundEnd({ battle }: UnitContext, act: () => void): void {
        this.hold(battle.roundEnded.add(act))
    }


    readonly #held: Observer[] = []
}
