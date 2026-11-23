import { concat } from "../../../../../semantic"
import type { Text } from "../../../../../semantic"
import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { counted } from "../../battle/words"
import { compoundCard, ElementCard } from "../../card/subs/spell/ElementCard"
import type { Element } from "../../element/Element"
import { reaction } from "../../element/reactions"
import { RoundStatus } from "../RoundStatus"
import { STATUS_LEVEL, familyType, statusVisual } from "../Status"
import type { StatusType } from "../Status"
import { elementOf, elementVariants } from "../StatusVariants"
import type { ElementType } from "../StatusVariants"
import { BATTLE_ROUND } from "../../base/keywords"

/** A ritual: an element kept for rounds, which makes the elements of the chain react with it. */
export const RITUAL_STATUS = familyType(
    "rituel", statusVisual("ritual", 0.8, 0.6, 1).with({ coloration: [0.8, 0.6, 1] }), "positive", {
        description: [
            "Pendant ", STATUS_LEVEL, " ", BATTLE_ROUND.as("rounds"), ", une fois la préparation finie, les éléments de ta chaîne qui réagissent ",
            "avec l'élément gardé deviennent leur composé.",
        ],
    },
)

/** The kinds of ritual, one for each element, looking like it. */
export const RITUAL_STATUSES = elementVariants(
    RITUAL_STATUS, element => `${RITUAL_STATUS} de ${element}`, (type, level) => new RitualStatus(type, level),
    (family, element) => {
        const { r, g, b } = element.color
        return family.with({ coloration: [r, g, b], color: [r, g, b] })
    },
)

/**
 * An element kept for rounds: once the preparation is over, each element of the chain that reacts with it is
 * replaced by what they give. Its level is its rounds.
 */
export class RitualStatus extends RoundStatus {


    constructor(
        public readonly type: ElementType,
        level: number,
    ){
        super(level)
    }


    /** The element it keeps. */
    public get element(): Element { return this.type.element }

    public override toString(): string { return `${this.type} ${counted(this.level, "round")}` }

    public override toSemString(): Text {
        return concat(RITUAL_STATUS, " de ", this.element, ` ${counted(this.level, "round")}`)
    }

    protected plug({ battle, unit }: UnitContext): Observer[] {
        return [battle.prepEnded.add(() => {
            if(!unit.alive) return
            const { chain } = unit
            for(let index = chain.cursor; index < chain.cards.length; index++){
                const card = chain.cards[index]
                const mixed = card instanceof ElementCard ? reaction(card.element, this.element) : null
                if(mixed) battle.replaceInChain(unit, index, 1, compoundCard(mixed))
            }
        })]
    }
}

/** The kind of a ritual of an element. */
export function ritualType(element: Element): StatusType { return RITUAL_STATUSES.of(element) }

/** The element kept by a kind of status, none when it is not the kind of a ritual. */
export function ritualElementOf(type: StatusType): Element|null { return elementOf(type, RITUAL_STATUS) }
