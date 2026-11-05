import type { Text } from "../../../../semantic"
import { colored } from "../base/Rgba"
import type { Rgba } from "../base/Rgba"

/**
 * A side of the battle, of any make: players, bots, or both. The units of a team see each other's chains
 * whole, the other teams see them only from the reveal, without their nested cards.
 */
export class Team {


    constructor(
        public readonly name: string,

        /** The color its name is written in, none to write it as the text around it. */
        public readonly color: Rgba|null = null,
    ){}


    public toString(): string { return this.name }

    public toSemString(): Text { return this.color ? colored(this.color, this.name) : this.name }
}
