import { UNIT } from "../../../base/keywords"
import { INVOCATION } from "../../../battle/mecanic/summon/keyword"
import { TURN } from "../../../battle/mecanic/turn/keyword"
import { WALK } from "../../../battle/mecanic/walk/keyword"
import * as Turn from "../../../battle/mecanic/turn"
import * as Walk from "../../../battle/mecanic/walk"
import type { Observer } from "../../../base/Observable"
import type { PlugContext } from "../../../battle/Action"
import type { Unit } from "../../../battle/Unit"
import { HeartCount } from "../../../battle/words"
import { Heart } from "../../../heart/Heart"
import { BLUE_HEART } from "../../../heart/subs/BlueHeartKind"
import { SHIELD_HEART } from "../../../heart/subs/ShieldHeartKind"
import { TIME_HEART } from "../../../heart/subs/TimeHeartKind"

import { AbstractItem } from "../AbstractItem"
import { visual } from "../../../base/Visual"

/** How far a leashed body goes before it turns, in meters. */
const LEASH_STEP = 1

/** Does a unit play cards of its own, as a robot or a turret does? */
function playsCards(body: Unit): boolean {
    return body.decks.all.some(deck => deck.pile.length > 0 || body.hand.length > 0)
}

/** What an item does to each body its unit summons, when it appears. */
function onSummon({ battle, unit, hold }: PlugContext, act: (body: Unit) => void): void {
    hold(battle.signals.spawned.add(({ unit: body }) => {
        if(body.owner === unit) act(body)
    }))
}

/** A gear: each body that plays cards of its own gains a shield. */
export class Gear extends AbstractItem {


    constructor(){
        super("Engrenage", visual("items/gear"), ["Chaque robot qu'elle construit gagne ", new HeartCount(1), " ", SHIELD_HEART, "."])
    }


    public init(ctx: PlugContext): void {
        onSummon(ctx, body => {
            if(playsCards(body)) body.hearts.give(new Heart(SHIELD_HEART))
        })
    }
}

export const GEAR = new Gear()

/** A cell: each body it summons that lives by time gains a round of time. */
export class Cell extends AbstractItem {


    constructor(){
        super("Pile", visual("items/battery"), [
            "Chaque ", INVOCATION.as("invocation"), " de ", TIME_HEART, " gagne ", new HeartCount(1), " de ", TIME_HEART,
            " de plus.",
        ])
    }


    public init(ctx: PlugContext): void {
        onSummon(ctx, body => {
            if(body.hearts.all.some(heart => heart.kind === TIME_HEART)) body.hearts.give(new Heart(TIME_HEART))
        })
    }
}

export const CELL = new Cell()

/** A leash: each body it summons goes ahead, then turns to the nearest unit that is neither it nor its summoner. */
export class Leash extends AbstractItem {


    constructor(){
        super("Laisse", visual("items/sling"), [
            "Chaque ", INVOCATION.as("invocation"), " ", WALK.as("avance"), " d'un mètre, puis ", TURN.as("se tourne"), " vers l'", UNIT,
            " la plus proche, hors son invocatrice.",
        ])
    }


    public init(ctx: PlugContext): void {
        const { battle, unit } = ctx
        onSummon(ctx, body => {
            Walk.move(battle, body, body.direction, LEASH_STEP, true)
            let nearest: Unit|null = null
            for(const other of battle.touchables){
                if(other === body || other === unit) continue
                if(!nearest || other.position.distance(body.position) < nearest.position.distance(body.position)) nearest = other
            }
            const toward = nearest?.position.minus(body.position).normalized
            if(toward) Turn.turn(battle, body, toward)
        })
    }
}

export const LEASH = new Leash()

/** A summoning heart: a body of its unit going away gives it a blue heart. */
export class SummonHeart extends AbstractItem {


    constructor(){
        super("Cœur d'invocation", visual("items/summon_heart"), [
            "Quand une de ses ", INVOCATION.as("invocations"), " disparaît : gagne ", new HeartCount(1), " ", BLUE_HEART, ".",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        const watched: Observer = battle.signals.vanished.add(({ unit: gone }) => {
            if(gone.owner === unit) unit.hearts.give(new Heart(BLUE_HEART))
        })
        hold(watched)
    }
}

export const SUMMON_HEART = new SummonHeart()
