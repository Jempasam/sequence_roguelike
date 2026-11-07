import { flagText, numberText } from "../sim/base/text"
import type { Attribute } from "../sim/base/Attribute"
import type { Unit, UnitStats } from "../sim/battle/Unit"
import type { ChainView } from "../sim/card/CardChain"

/** A chain as a viewer sees it, on one line: the roots in order, what is nested in parentheses. */
export function chainText(views: readonly ChainView[]): string {
    if(views.length === 0) return "(rien)"
    return views.map(nodeText).join(" > ")
}

function nodeText(view: ChainView): string {
    const name = view.card.name
    if(view.inputs.length === 0) return name
    return `${name}(${view.inputs.map(input => input ? nodeText(input) : "_").join(", ")})`
}

/** The hearts of a unit, as those not empty over all of them. */
export function heartsText(unit: Unit): string {
    return `♥${unit.life}/${unit.hearts.maxHearts}`
}

/** A stat of a unit as the interface shows it: its name, its value, and how it stands to its base. */
export interface StatLine {
    readonly name: string
    readonly value: string

    /** Its base, none when the value is the base. */
    readonly base: string|null

    /** Is the value above its base, below, or the same? */
    readonly change: "up"|"down"|"same"
}

/** A number stat of a unit, with what comes before and after its value: a unit of measure, a "×". */
function numberStat(name: string, attribute: Attribute<number>, unit = "", before = ""): StatLine {
    const { value, base } = attribute
    const shown = (number: number) => `${before}${numberText(number)}${unit}`
    const change = value > base ? "up" : value < base ? "down" : "same"
    return { name, value: shown(value), base: change === "same" ? null : shown(base), change }
}

/** A yes or no stat of a unit. */
function flagStat(name: string, attribute: Attribute<boolean>): StatLine {
    const same = attribute.value === attribute.base
    return { name, value: flagText(attribute.value), base: same ? null : flagText(attribute.base), change: "same" }
}

/** The stats of a unit, as its attributes hold them, then its deck. */
export function statLines(unit: Unit): StatLine[] {
    const { stats, decks, hand } = unit
    return [
        ...attributeLines(stats),
        {
            name: "Cartes", value: `main ${hand.length} · pioche ${decks.piles.length} · défausse ${decks.discards.length}`,
            base: null, change: "same",
        },
    ]
}

/** The stats of a unit as its attributes hold them. */
export function attributeLines(stats: UnitStats): StatLine[] {
    const mobile = stats.mobility.value > 0
    return [
        numberStat("Taille de chaîne", stats.chainSize),
        numberStat("Main max", stats.handSize),
        numberStat("Pioche par round", stats.draw),
        numberStat("Pioche de départ", stats.firstDraw),
        numberStat("Force", stats.strength),
        numberStat("Précision", stats.precision),
        numberStat("Agilité", stats.move, "", "×"),
        numberStat("Vision", stats.aimRange, " m"),
        numberStat("Portée", stats.throwRange, "", "×"),
        numberStat("Soin", stats.heal),
        numberStat("Invocation", stats.summon),
        numberStat("Alchimie", stats.alchemy),
        { name: "Mobilité", value: mobile ? "libre" : "immobilisé", base: null, change: mobile ? "same" : "down" },
        flagStat("Deck ordonné", stats.ordered),
    ]
}
