import type { Text } from "../../../../semantic"
import { colored, rgba } from "../base/Rgba"
import type { PlugContext } from "../battle/Action"

import type { Process } from "./Process"
import type { Visual } from "../base/Visual"

/** A process that names itself and draws itself from its name and its icon, which gives its color. */
export abstract class AbstractProcess implements Process {


    constructor(
        public readonly name: string,
        public readonly icon: Visual,
    ){}


    public toString(): string { return this.name }

    public toSemString(): Text {
        const [r, g, b] = this.icon.color
        return colored(rgba(r, g, b), this.name)
    }

    /** Plug in what it does, nothing by default: it may only be there. */
    public init(ctx: PlugContext): void {
        void ctx
    }
}
