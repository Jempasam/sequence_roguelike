import { rgba } from "../../base/Rgba"
import type { Element } from "../../element/Element"
import { AbstractProcess } from "../AbstractProcess"

/** An element kept for the round, for what meets it: an echo. */
export class Ritual extends AbstractProcess {


    constructor(
        /** The element it keeps. */
        public readonly element: Element,
    ){
        super(`rituel de ${element}`, "ritual", rgba(0.8, 0.6, 1))
    }
}
