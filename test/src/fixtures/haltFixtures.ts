import { plainText } from "@game/core"
import type { Text } from "@game/core"
import { deckNameOf, forge, Run, SLASH, STEP, THRUST } from "@game/core/mecard"
import type { Card, Choosing, Count, HaltContext, HaltMoment, Hero, Shown, Way } from "@game/core/mecard"

/** How many answers a play gives at most, so a shop that can always be asked again ends. */
const MAX_ANSWERS = 40

/** Which of some options a player takes, given how many there are. */
export type Chooser = (count: number) => number

/**
 * A player answering the dialogs of a halt, by a chooser taking the first option by default. Each dialog
 * waits for {@link play} or {@link answer}, so a halt can be left on any of them, and everything shown is
 * kept in {@link log}, as text.
 */
export class ScriptedPlayer implements HaltContext {


    /** What the dialogs showed and the halt did, in order. */
    public readonly log: string[] = []

    constructor(
        /** The run played. */
        public readonly run: Run,

        /** Which option to take. */
        public readonly choose: Chooser = () => 0,
    ){}


    /** Is a dialog waiting for an answer? */
    public get waiting(): boolean { return this.#answer !== null }

    /** Answer the dialog open. */
    public answer(): void {
        const answer = this.#answer
        this.#answer = null
        answer?.()
    }

    /** Answer dialogs until the visit is over, or {@link MAX_ANSWERS} were. */
    public play(): void {
        for(let count = 0; this.waiting && count < MAX_ANSWERS; count++) this.answer()
    }

    public offer<T>(
        title: Text, offers: readonly T[], show: (offer: T) => Shown, done: (offer: T) => void, way: Way = {},
    ): void {
        this.#say("offer", title, ...offers.map(offer => this.#shown(show(offer))))
        this.#wait(offers, done, way)
    }

    public hero(title: Text, done: (hero: Hero) => void, pick: Choosing<Hero> = {}): void {
        const heroes = this.run.heroes.filter(pick.among ?? (() => true))
        if(heroes.length === 0){
            this.tell("Personne dans l'équipe ne peut en profiter.")
            this.react("refuse")
            return
        }
        this.#say("hero", title, ...heroes.map(hero => hero.name))
        this.#wait(heroes, done, pick)
    }

    public cards(
        title: Text, pool: readonly Card[], count: Count, done: (cards: Card[]) => void,
        pick: Choosing<Card> = {},
    ): void {
        const among = pool.filter(pick.among ?? (() => true))
        this.#say("cards", title, ...among.map(card => card.name))
        const start = among.length > count.min ? this.choose(among.length - count.min + 1) : 0
        const cards = among.slice(start, start + count.min)
        this.#answer = () => done(cards)
    }

    public confirm(title: Text, shown: Shown, action: string, done: () => void, way: Way = {}): void {
        this.#say("confirm", title, this.#shown(shown), action)
        this.#answer = way.back && this.choose(4) === 3 ? way.back : done
    }

    public tell(text: Text, shown?: Shown): void {
        this.#say("tell", text, shown ? this.#shown(shown) : "")
        this.#answer = null
    }

    public leave(): void {
        this.#say("leave")
        this.#answer = null
    }

    public react(moment: HaltMoment): void {
        this.log.push(`react ${moment}`)
    }


    /** What answers the dialog open, none when none is. */
    #answer: (() => void)|null = null

    /** Wait to take one of some options, or to go back, one time out of the options and one. */
    #wait<T>(options: readonly T[], done: (option: T) => void, way: Way): void {
        const back = way.back
        if(options.length === 0 && !back){
            this.#answer = null
            return
        }
        const taken = this.choose(options.length + (back ? 1 : 0))
        this.#answer = back && taken === options.length ? back : () => done(options[taken])
    }

    #say(dialog: string, ...texts: Text[]): void {
        this.log.push(`${dialog}: ${texts.map(text => plainText(text)).join(" | ")}`)
    }

    #shown(shown: Shown): string {
        const unit = shown.unit ? `${shown.unit.name} ` : ""
        const parts = [
            `${unit}[${shown.cards.map(card => card.name).join(", ")}]`,
            ...(shown.decks ?? []).map(deck => this.#deck(deck)),
            ...(shown.items ?? []).map(item => item.name),
            ...(shown.usables ?? []).map(usable => usable.name),
            plainText(shown.text ?? ""),
        ]
        return parts.join(" ")
    }

    /** A deck of the party shown, by its name among those of its character, with its cards. */
    #deck(deck: readonly Card[]): string {
        const owner = this.run.heroes.find(hero => hero.decks.includes(deck as Card[]))
        const name = owner ? deckNameOf(owner, deck) : "Deck ?"
        return `${name} [${deck.map(card => card.name).join(", ")}]`
    }
}

/**
 * A run where every halt has something to do: gold to spend, a wounded party of two, a deck holding a
 * fusion and two copies of cards.
 */
export function preparedRun(seed: number): Run {
    const run = new Run(seed)
    run.gold = 1000
    const [first] = run.heroes
    first.decks[0].push(THRUST, THRUST, SLASH, SLASH, STEP, STEP)
    forge(first.decks[0], [SLASH, SLASH])
    first.hearts[0].isEmpty = true
    return run
}

/** All a run holds that a halt may change, as text. */
export function stateOf(run: Run): string {
    const heroes = run.heroes.map(hero => {
        const hearts = hero.hearts.map(heart => heart.isEmpty ? "o" : "x").join("")
        const usables = hero.usables.map(carried => carried.usable.name)
        return `${hero.name} ${hearts} ${hero.decks.map(deck => deck.map(card => card.name).join(",")).join(" | ")} / ${hero.items.map(item => item.name).join(",")} / ${usables.join(",")}`
    })
    return [`${run.travel.floor.type.name} ${run.travel.floor.level}`, `${run.gold} gold`, ...heroes].join("\n")
}
