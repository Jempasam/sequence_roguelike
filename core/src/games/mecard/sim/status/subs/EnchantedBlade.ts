import { concat } from "../../../../../semantic"
import type { Text } from "../../../../../semantic"
import type { UnitContext } from "../../battle/Action"
import type { Element } from "../../element/Element"
import { BaseStatus } from "../BaseStatus"
import { familyType, statusVisual } from "../Status"
import type { StatusType } from "../Status"
import { elementVariants } from "../StatusVariants"
import type { ElementType } from "../StatusVariants"
import { BATTLE_ROUND } from "../../base/keywords"

/** An enchanted blade: the blows apply the negative of an element. */
export const ENCHANTED = familyType("lame enchantée", statusVisual("coated", 0.7, 0.75, 1), "positive", {
    description: ["Jusqu'à la fin du ", BATTLE_ROUND, ", chaque attaque qui touche applique le négatif de son élément à sa cible."],
})

/** The kinds of enchanted blade, one for each element. */
export const ENCHANTMENTS = elementVariants(
    ENCHANTED, element => `${ENCHANTED} (${element})`, (type, level) => new EnchantedBlade(type, level),
)

/**
 * An enchanted blade: until the end of the round, each of its attacks that lands applies the negative of its
 * element to what it hit.
 */
export class EnchantedBlade extends BaseStatus {


    constructor(
        public readonly type: ElementType,
        level: number,
    ){
        super(level)
    }


    /** The element it applies. */
    public get element(): Element { return this.type.element }

    public override toString(): string { return `${ENCHANTED} (${this.element})` }

    public override toSemString(): Text { return concat(ENCHANTED, " (", this.element, ")") }

    public init(ctx: UnitContext): void {
        const { battle, unit } = ctx
        this.keep(
            unit.hitting.add(({ target }) => {
                if(target.alive) this.element.applyNegative(ctx, target)
            }),
            battle.roundEnded.add(() => battle.removeStatus(unit, this.type)),
        )
    }

    public remove(): void {
        this.letGo()
    }
}

/** The kind of an enchanted blade of an element. */
export function enchantmentOf(element: Element): StatusType { return ENCHANTMENTS.of(element) }
