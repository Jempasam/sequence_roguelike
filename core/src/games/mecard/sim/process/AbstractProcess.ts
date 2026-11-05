import type { Text } from "../../../../semantic"
import { colored } from "../base/Rgba"
import type { Rgba } from "../base/Rgba"
import type { PlugContext } from "../battle/Action"

import type { Process } from "./Process"

/** A process that names itself and draws itself from its name, its icon and its color. */
export abstract class AbstractProcess implements Process {


    constructor(
        public readonly name: string,
        public readonly icon: string,
        public readonly color: Rgba,
    ){}


    public toString(): string { return this.name }

    public toSemString(): Text { return colored(this.color, this.name) }

    /** Plug in what it does, nothing by default: it may only be there. */
    public init(ctx: PlugContext): void {
        void ctx
    }
}
