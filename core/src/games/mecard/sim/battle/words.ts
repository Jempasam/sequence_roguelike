import type { Keyword, KeywordWord, Semantic, Text } from "../../../../semantic"
import { HEART } from "../base/keywords"
import { colored, rgba } from "../base/Rgba"
import { numberText } from "../base/text"
import type { Rgba } from "../base/Rgba"
import type { Nature } from "./events"

// The words the texts of the game are written with: what a description or a line of the log names, each
// telling itself, so a number of damage reads as damage wherever it is shown.

/** The color a damage is named in, by its nature. */
const NATURE_COLORS: Readonly<Record<Nature, Rgba>> = {
    physical: rgba(1, 0.95, 0.85),
    elemental: rgba(1, 0.6, 0.25),
}

/** The color a distance is named in: the one of the reach in the previews. */
const DISTANCE_COLOR = rgba(0.55, 0.85, 1)

/** The color a number of hearts is named in: the one of the red hearts. */
const HEARTS_COLOR = rgba(0.9, 0.15, 0.2)

/** A number as the texts of the game write it: rounded, its decimals after a comma, `1,3`. */
export function frenchNumber(value: number): string {
    return numberText(value).replace(".", ",")
}

/**
 * The hearts a hit takes, of a nature: a number and a heart in the color of the nature, `2 dégâts` in a
 * plain string.
 */
export class Damage implements Semantic {


    constructor(
        public readonly amount: number,
        public readonly nature: Nature,

        /** The stat of the unit coming on top, none when none: `force`, `précision`. */
        public readonly bonus: string|null = null,
    ){}


    public toString(): string {
        return `${frenchNumber(this.amount)} ${this.#word}${this.bonus ? ` + ${this.bonus}` : ""}`
    }

    public toSemString(): Text {
        const amount = colored(NATURE_COLORS[this.nature], [frenchNumber(this.amount), " ", HEART.as(this.#word)])
        return this.bonus ? [amount, ` + ${this.bonus}`] : amount
    }


    get #word(): string { return this.amount > 1 ? "dégâts" : "dégât" }
}

/** Hearts, lost or healed: a number and a red heart. */
export class HeartCount implements Semantic {


    constructor(
        public readonly amount: number,
    ){}


    public toString(): string { return `${frenchNumber(this.amount)} cœur${this.amount > 1 ? "s" : ""}` }

    public toSemString(): Text {
        const word = this.amount > 1 ? "cœurs" : "cœur"
        return colored(HEARTS_COLOR, [frenchNumber(this.amount), " ", HEART.as(word)])
    }
}

/** A distance in the arena, in meters: `1,3 m`, in the color of the reach. */
export class Meters implements Semantic {


    constructor(
        public readonly value: number,
    ){}


    public toString(): string { return `${frenchNumber(this.value)} m` }

    public toSemString(): Text { return colored(DISTANCE_COLOR, this.toString()) }
}

/** A count of something, its word made plural past one: `2 rounds`, `1 étape`. */
export function counted(count: number, word: string, plural = `${word}s`): string {
    return `${frenchNumber(count)} ${count > 1 ? plural : word}`
}

/** A keyword made plural past one, in a text: `CARTE` written `carte` or `cartes`. */
export function keywordOf(count: number, keyword: Keyword): KeywordWord {
    return keyword.as(count > 1 ? `${keyword.name}s` : keyword.name)
}

/** A count of a keyword, in a text: `3 cartes`. */
export function countedWord(count: number, keyword: Keyword): Text {
    return [`${frenchNumber(count)} `, keywordOf(count, keyword)]
}

/** A distance in the arena, in a text. */
export function meters(value: number): Meters {
    return new Meters(value)
}

/** A damage of physical blows, in a text: the strength of the unit comes on top. */
export function blowDamage(amount: number): Damage {
    return new Damage(amount, "physical", "force")
}

/** A damage of shots, in a text: the precision of the unit comes on top. */
export function shotDamage(amount: number): Damage {
    return new Damage(amount, "physical", "précision")
}

/** A damage, in a text. */
export function damage(amount: number, nature: Nature): Damage {
    return new Damage(amount, nature)
}
