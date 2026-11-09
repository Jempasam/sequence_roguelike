import type { Element } from "../../element/Element"
import { AbstractProcess } from "../AbstractProcess"
import { visual } from "../../base/Visual"

/** An element kept for the round, for what meets it: an echo. */
export class Ritual extends AbstractProcess {


    constructor(
        /** The element it keeps. */
        public readonly element: Element,
    ){
        super(`rituel de ${element}`, visual("processes/ritual", { color: [0.8, 0.6, 1] }),
            `Garde l'élément ${element} : ce qui le rencontre y trouve un écho.`,
        )
    }
}
