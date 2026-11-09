import type { Text } from "../../../../semantic"
import type { Card } from "../card/Card"
import type { Count, Shown } from "../halt/HaltContext"
import type { Hero } from "../run/Hero"

/**
 * What a halt asks the players, open until they answer it through its {@link Travel}: all of it is read
 * when it opens, so it can be shown, or answered, with nothing of the halt.
 */
export abstract class Dialog {


    constructor(
        public readonly title: Text,

        /** May it go back to the dialog before it? When not, it is left by leaving the place. */
        public readonly back: boolean,
    ){}
}

/** Things offered, the players taking one. */
export class OfferDialog extends Dialog {


    constructor(
        title: Text,
        back: boolean,

        /** What each offer shows, in the order offered. */
        public readonly offers: readonly Shown[],
    ){
        super(title, back)
    }
}

/** A character of the party asked for. */
export class HeroDialog extends Dialog {


    constructor(
        title: Text,
        back: boolean,

        /** The characters who may be taken. */
        public readonly heroes: readonly Hero[],

        /** Was it asked while a pick was taken in? It then follows the dialog of that pick, still open. */
        public readonly follows: boolean,
    ){
        super(title, back)
    }
}

/** Cards asked for among some, in the order the players pick them. */
export class CardsDialog extends Dialog {


    constructor(
        title: Text,
        back: boolean,

        /** The cards shown. */
        public readonly pool: readonly Card[],

        /** May each card of the pool be picked? */
        public readonly selectable: readonly boolean[],

        /** May each card of the pool be picked any number of times, as a card played unlimited is? */
        public readonly repeatable: readonly boolean[],

        /** How many are asked. */
        public readonly count: Count,

        /** The deck of the party the pool comes from. */
        public readonly from: readonly Card[],
    ){
        super(title, back)
    }
}

/** Something shown, the players asked whether to go on with it. */
export class ConfirmDialog extends Dialog {


    constructor(
        title: Text,
        back: boolean,
        public readonly shown: Shown,

        /** What going on is called. */
        public readonly action: string,
    ){
        super(title, back)
    }
}

/** What came of the visit, which only leaves the place. */
export class TellDialog extends Dialog {


    constructor(
        title: Text,

        /** What it shows under what it says, none for nothing. */
        public readonly shown: Shown|null,
    ){
        super(title, false)
    }
}
