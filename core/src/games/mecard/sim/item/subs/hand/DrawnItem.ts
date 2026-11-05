import type { PlugContext, UnitContext } from "../../../battle/Action"

import { AbstractItem } from "../AbstractItem"

/** An item acting on the hand of its unit once the unit drew its cards for the round. */
export abstract class DrawnItem extends AbstractItem {


    public init(ctx: PlugContext): void {
        ctx.hold(ctx.unit.drawn.add(() => this.drawn(ctx)))
    }


    /** Act on the hand of the unit, its cards for the round just drawn. */
    protected abstract drawn(ctx: UnitContext): void
}
