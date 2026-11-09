import type { Keyword, KeywordWord, Semantic, Text } from "../../../../semantic"
import { HEART } from "../base/keywords"
import { colored, rgba } from "../base/Rgba"
import { numberText } from "../base/text"

// The words the texts of the game are written with: what a description or a line of the log names, each
// telling itself. A damage is its number then its `DamageType`, a distance its number then `DISTANCE`, a stat
// its keyword: `["inflige ", 1, "+", FORCE, " ", DamageType.PHYSICAL]`.

/** The color a number of hearts is named in: the one of the red hearts. */
const HEARTS_COLOR = rgba(0.9, 0.15, 0.2)

/** A number as the texts of the game write it: rounded, its decimals after a comma, `1,3`. */
export function frenchNumber(value: number): string {
    return numberText(value).replace(".", ",")
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
