import type { GameMember } from "../../GameMember"
import type { GameModeContext } from "../../GameModeContext"
import type { GameModeShareable } from "../../GameModeShareable"
import { NoAnswerFault } from "../../HandleChannel"

/** The key of the question put to a member by default. */
export const PROMPT_KEY = "prompt"

/** A question put to one member: what it may choose among, and for how long. */
export type Prompt = {
    /** Tells the kind of question, so each part of a mode shows its own. */
    readonly key: string

    /** Tells it from the questions before, so an order to close an old one never closes the new. */
    readonly id: number

    /** The id of the member that answers. */
    readonly who: string

    /** What it may choose among. */
    readonly options: readonly string[]

    /** How long it has, in milliseconds. */
    readonly ms: number

    /** Told with the options, for the screen to write: what is chosen for. */
    readonly title: string
}

/** What a screen does with the questions of a {@link Picker}, which it knows nothing else of. */
export interface PromptBench {
    /**
     * Show a question to this client, in place of the one shown.
     *
     * @param context - What the mode tells besides the options, for the screen to write.
     * @param choose - Answer with one of the options.
     */
    showPrompt(prompt: Prompt, context: unknown, choose: (option: string) => void): void

    /** Take the question off the screen. */
    hidePrompt(): void
}

/** What a question came to. */
export interface Chosen {
    readonly choice: string

    /** Was it drawn, since the member did not answer in time, or is not there? */
    readonly drawn: boolean
}

/** What the manager tells a member to close a question that went unanswered. */
type Unprompt = { readonly unprompt: number, readonly key: string }

/**
 * What the manager asks a member to choose with: one question at a time, put by `ask` to the member alone, and
 * drawn at random when the member is not there, does not answer in time, or answers with what is not an
 * option.
 *
 * @remarks
 * Any mode that has a member pick among a few things uses it: a draft of kits, the enemies of an encounter,
 * what a saboteur sends. It tells nothing of what the options are for beyond a title the screen writes.
 */
export class Picker {


    constructor(
        private readonly ctx: GameModeContext,

        /** The key each question of this picker carries: each kind of question of a mode has its own. */
        private readonly key: string = PROMPT_KEY,
    ){}


    /**
     * Ask a member to choose.
     *
     * @param isHere - Whether the member is there to answer: if it is not, the choice is drawn at once.
     * @returns The choice; it never rejects. None when there are no options.
     */
    public async ask(
        who: GameMember, options: readonly string[], ms: number, title: string, isHere = who.connected,
    ): Promise<Chosen|null> {
        if(options.length === 0) return null
        // Its own copy: the options of a question never change once it is asked.
        const prompt: Prompt = { key: this.key, id: this.#next++, who: who.id, options: [...options], ms, title }
        if(!isHere) return this.#draw(options)
        const channel = this.ctx.channel(who)
        const answer: unknown = await channel.ask(prompt, ms)
        if(answer instanceof NoAnswerFault){
            // A prompt that is still shown is closed: the member was too slow.
            channel.notify({ unprompt: prompt.id, key: this.key } satisfies Unprompt)
            return this.#draw(options)
        }
        // The list a member answers from may be stale: the answer is revalidated here.
        return typeof answer === "string" && options.includes(answer)
            ? { choice: answer, drawn: false }
            : this.#draw(options)
    }


    #next = 0

    #draw(options: readonly string[]): Chosen {
        return { choice: options[this.ctx.rng().int(options.length)], drawn: true }
    }
}

/**
 * What a client does with the questions of a {@link Picker}: show them to the screen, answer with the option
 * chosen, and close one the manager gave up on.
 */
export class PickerClient {


    constructor(
        private readonly bench: PromptBench,

        /** What the mode tells the screen besides the options, when it shows a question. */
        private readonly context: () => unknown,

        /** The key of the questions it shows: the others are left alone. */
        private readonly key: string = PROMPT_KEY,
    ){}


    /**
     * The manager asks a question.
     *
     * @returns The answer, once it is chosen; none when the message is not a question of this key.
     */
    public onAsk(message: GameModeShareable): Promise<GameModeShareable>|undefined {
        const prompt = message as unknown as Partial<Prompt>|null
        if(!prompt || prompt.key !== this.key || typeof prompt.id !== "number") return undefined
        return new Promise<GameModeShareable>(resolve => {
            this.#shown = prompt.id as number
            this.bench.showPrompt(prompt as Prompt, this.context(), option => {
                this.#shown = null
                this.bench.hidePrompt()
                resolve(option)
            })
        })
    }

    /** The manager says something: a question it gave up on is taken off the screen. */
    public onOrder(message: GameModeShareable): void {
        const { unprompt, key } = (message ?? {}) as Partial<Unprompt>
        if(key !== this.key || unprompt !== this.#shown) return
        this.#shown = null
        this.bench.hidePrompt()
    }


    #shown: number|null = null
}
