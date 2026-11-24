import { Vector2 } from "../base/Vector2"
import { Arena } from "../battle/Arena"
import { Battle } from "../battle/Battle"
import { Team } from "../battle/Team"
import type { Unit } from "../battle/Unit"
import type { Card } from "../card/Card"
import { CardChain, signatureOf } from "../card/CardChain"
import { ACTION, PREPARATION } from "../card/CardType"
import { ALL_CARDS } from "../catalog/cards"
import { Heart } from "../heart/Heart"
import type { HeartKind } from "../heart/HeartKind"
import { RED_HEART } from "../heart/subs/RedHeartKind"
import { SHIELD_HEART } from "../heart/subs/ShieldHeartKind"
import type { StatusType } from "../status/Status"

/** What a card did when played alone in front of a dummy: a hint of what it is for, never a certainty. */
export interface CardMeasure {
    /** How far the unit moved, in cells. */
    readonly moved: number

    /** How far the unit turned, in half turns: 0 not at all, 1 to the opposite side. */
    readonly turned: number

    /** How many hearts the dummy lost. */
    readonly damage: number

    /** How many hearts the unit got back. */
    readonly healed: number

    /** How many shield hearts the unit gained. */
    readonly shield: number

    /** How many bodies the card put in the battle. */
    readonly summoned: number
}

/** Hearts of a kind that a card gave to the unit. */
export interface HeartGift {
    readonly kind: HeartKind
    readonly count: number
}

/** What a card put on the dummy and on the unit when played alone: statuses, and hearts. */
export interface CardEffects {
    /** The kinds of status the dummy came to hold. */
    readonly onTarget: readonly StatusType[]

    /** The kinds of status the unit came to hold. */
    readonly onSelf: readonly StatusType[]

    /** The hearts the unit gained, by kind: the ones it got back count too. */
    readonly hearts: readonly HeartGift[]
}

/**
 * What playing a card alone showed: what it did, and what it put on others. Each none when nothing was
 * seen.
 */
export interface Probe {
    readonly measure: CardMeasure|null
    readonly effects: CardEffects|null
}

/**
 * Where the dummy stands from the unit, in cells: right next to it, close, far, and off to the side where a
 * card that aims has something to turn to.
 */
const PLACES: readonly { across: number, ahead: number }[] = [
    { across: 0, ahead: 1 }, { across: 0, ahead: 2 }, { across: 0, ahead: 4 }, { across: 2, ahead: 3 },
]

/** What the dummy holds: enough not to die of what one card does. */
const DUMMY_HEARTS = 20

/** The cells of the arena the probe plays in, the unit at the bottom middle facing up. */
const SIZE = 9
const START = new Vector2(4, 7)

/** What probes say of cards already probed. */
const KNOWN = new WeakMap<Card, Probe>()

/** What one trial saw. */
interface Trial {
    readonly measure: CardMeasure
    readonly effects: CardEffects
}

function shieldsOf(unit: Unit): number {
    return unit.hearts.all.filter(heart => heart.kind === SHIELD_HEART && !heart.isEmpty).length
}

/** How many hearts of each kind a unit holds that are not empty. */
function filled(unit: Unit): Map<HeartKind, number> {
    const found = new Map<HeartKind, number>()
    for(const heart of unit.hearts.all){
        if(!heart.isEmpty) found.set(heart.kind, (found.get(heart.kind) ?? 0) + 1)
    }
    return found
}

/** The cards that take what a card gives and play it as an action, for each thing a card may give. */
const CARRIERS = new Map<Card["output"], readonly Card[]>()

/**
 * The cards that play what a card gives, when it cannot be played alone: those of the game that take it and
 * give an action, holding no cards of their own. A potion is drunk or thrown, an element is cast.
 */
function carriersOf(output: Card["output"]): readonly Card[] {
    const known = CARRIERS.get(output)
    if(known) return known
    const carriers = ALL_CARDS.filter(card => {
        const signature = signatureOf(card)
        return signature.input === output && signature.output === ACTION && !card.contents
    })
    CARRIERS.set(output, carriers)
    return carriers
}

/** Does a card give something only another card plays: a potion, an element? */
function needsCarrier(card: Card): boolean {
    return card.input === null && card.output !== ACTION && card.output !== PREPARATION
}

/** The cards of the game that give the same thing as a card and are played by the same carriers. */
function siblingsOf(card: Card): readonly Card[] {
    const same = ALL_CARDS.filter(each => {
        return each.input === null && each.output === card.output && !each.contents
    })
    return [...new Set([...same, card])]
}

/** What the cards do played together as one chain, the dummy at a place. */
function trial(cards: readonly Card[], place: { across: number, ahead: number }): Trial|null {
    const battle = new Battle(new Arena(SIZE, SIZE), 1)
    const unit = battle.add({
        name: "probe", team: new Team("Probe"), controller: "player", position: START, direction: Vector2.UP,
        hearts: [
            new Heart(RED_HEART), new Heart(RED_HEART),
            new Heart(RED_HEART, true), new Heart(RED_HEART, true),
        ],
        decks: [[]],
    })
    const dummy = battle.add({
        name: "dummy", team: new Team("Dummy"), controller: "player",
        position: new Vector2(START.x + place.across, START.y - place.ahead),
        direction: Vector2.DOWN, hearts: Heart.many(RED_HEART, DUMMY_HEARTS), decks: [[]],
    })
    const before = {
        position: unit.position, direction: unit.direction, life: unit.life, units: battle.units.length,
        hearts: filled(unit),
    }
    const foeLife = dummy.life
    battle.startRound()
    unit.hand.push(...cards)
    battle.commit(unit, new CardChain(cards))
    battle.endPreparation()
    battle.playRound()
    if(battle.events.some(event => event.type === "error")) return null
    const after = filled(unit)
    const hearts = [...after].flatMap(([kind, count]) => {
        const gained = count - (before.hearts.get(kind) ?? 0)
        return gained > 0 ? [{ kind, count: gained }] : []
    })
    return {
        measure: {
            moved: unit.position.distance(before.position),
            turned: Math.acos(Math.max(-1, Math.min(1, unit.direction.dot(before.direction)))) / Math.PI,
            damage: Math.max(0, foeLife - dummy.life),
            healed: Math.max(0, unit.life - before.life),
            shield: shieldsOf(unit),
            summoned: Math.max(0, battle.units.length - before.units),
        },
        effects: { onTarget: [...dummy.statuses.keys()], onSelf: [...unit.statuses.keys()], hearts },
    }
}

/** Has the card done anything the probe can see? */
function seen(measure: CardMeasure): boolean {
    return Object.values(measure).some(value => value > 1e-6)
}

/** The best of two measures, field by field. */
function larger(first: CardMeasure, second: CardMeasure): CardMeasure {
    return {
        moved: Math.max(first.moved, second.moved), turned: Math.max(first.turned, second.turned),
        damage: Math.max(first.damage, second.damage), healed: Math.max(first.healed, second.healed),
        shield: Math.max(first.shield, second.shield), summoned: Math.max(first.summoned, second.summoned),
    }
}

/**
 * What two trials put on others together: each kind of status once, the larger gift of each kind of
 * heart.
 */
function together(first: CardEffects, second: CardEffects): CardEffects {
    const gifts = new Map<HeartKind, number>()
    for(const { kind, count } of [...first.hearts, ...second.hearts]){
        gifts.set(kind, Math.max(count, gifts.get(kind) ?? 0))
    }
    return {
        onTarget: [...new Set([...first.onTarget, ...second.onTarget])],
        onSelf: [...new Set([...first.onSelf, ...second.onSelf])],
        hearts: [...gifts].map(([kind, count]) => ({ kind, count })),
    }
}

/** Has a card put anything on anyone? */
function putSomething(effects: CardEffects): boolean {
    return effects.onTarget.length + effects.onSelf.length + effects.hearts.length > 0
}

/** What a carrier put on the dummy and on the unit playing each card, at every place put together. */
const PLAYED = new Map<Card, Map<Card, CardEffects>>()

/** What a carrier puts on the dummy and on the unit as it plays a card, at every place put together. */
function playedBy(carrier: Card, card: Card): CardEffects {
    const known = PLAYED.get(carrier)?.get(card)
    if(known) return known
    let effects: CardEffects = { onTarget: [], onSelf: [], hearts: [] }
    for(const place of PLACES){
        const found = attempt([carrier, card], place)
        if(found) effects = together(effects, found.effects)
    }
    const kept = PLAYED.get(carrier) ?? new Map<Card, CardEffects>()
    kept.set(card, effects)
    PLAYED.set(carrier, kept)
    return effects
}

/**
 * What a carrier puts on whatever it plays: what it puts with every card of a set, whichever it is given. A
 * set of one card tells nothing of it.
 */
function ownOf(carrier: Card, siblings: readonly Card[]): CardEffects {
    if(siblings.length < 2) return { onTarget: [], onSelf: [], hearts: [] }
    const all = siblings.map(card => playedBy(carrier, card))
    const hearts = all[0].hearts.flatMap(({ kind }) => {
        const counts = all.map(effects => effects.hearts.find(gift => gift.kind === kind)?.count ?? 0)
        return counts.every(each => each > 0) ? [{ kind, count: Math.min(...counts) }] : []
    })
    return {
        onTarget: all[0].onTarget.filter(type => all.every(effects => effects.onTarget.includes(type))),
        onSelf: all[0].onSelf.filter(type => all.every(effects => effects.onSelf.includes(type))),
        hearts,
    }
}

/** What a card put on top of what its carrier puts on whatever it plays. */
function without(effects: CardEffects, own: CardEffects): CardEffects {
    return {
        onTarget: effects.onTarget.filter(type => !own.onTarget.includes(type)),
        onSelf: effects.onSelf.filter(type => !own.onSelf.includes(type)),
        hearts: effects.hearts.flatMap(({ kind, count }) => {
            const known = own.hearts.find(gift => gift.kind === kind)?.count ?? 0
            return count > known ? [{ kind, count: count - known }] : []
        }),
    }
}

/** A trial that fails is none: a card that cannot be played there tells nothing. */
function attempt(cards: readonly Card[], place: { across: number, ahead: number }): Trial|null {
    try {
        return trial(cards, place)
    }
    catch{
        return null
    }
}

/**
 * What a card does played alone in front of a dummy, at several places, as far as it can be seen: what it
 * did, and what it put on the dummy and on the unit. Each is none when the card takes an input, does nothing
 * the probe sees, or fails.
 *
 * @remarks
 * A card that gives a potion or an element does nothing alone: its effects are what the cards of the game
 * that play it show, one after the other, put together, less what each of those puts whatever it plays (a
 * bubble that wears a soap whatever the potion). Its measure is only what it did alone, so the way a card is
 * told apart from the others does not depend on which cards carry it.
 *
 * The result is a hint among others, the description and the types: a card that cannot be probed is not
 * wrong, only told by what remains. The result is kept for each card.
 */
export function probe(card: Card): Probe {
    const known = KNOWN.get(card)
    if(known) return known
    let measure: CardMeasure|null = null
    let effects: CardEffects|null = null
    if(card.input === null){
        // Seule //
        for(const place of PLACES){
            const found = attempt([card], place)
            if(!found) continue
            measure = measure ? larger(measure, found.measure) : found.measure
            effects = effects ? together(effects, found.effects) : found.effects
        }
        // Avec ce qui la joue //
        if(needsCarrier(card)){
            const siblings = siblingsOf(card)
            for(const carrier of carriersOf(card.output)){
                const added = without(playedBy(carrier, card), ownOf(carrier, siblings))
                effects = effects ? together(effects, added) : added
            }
        }
    }
    const result = {
        measure: measure && seen(measure) ? measure : null,
        effects: effects && putSomething(effects) ? effects : null,
    }
    KNOWN.set(card, result)
    return result
}

/** What a card did played alone, none when nothing was seen. */
export function probeCard(card: Card): CardMeasure|null {
    return probe(card).measure
}

/** What a card put on the dummy and on the unit played alone, none when nothing was seen. */
export function probeEffects(card: Card): CardEffects|null {
    return probe(card).effects
}
