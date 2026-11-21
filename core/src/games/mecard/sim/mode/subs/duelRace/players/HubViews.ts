import type { Observer } from "../../../../base/Observable"

import { signal } from "../../../../../sync/faults"
import type { Progress } from "../../../../../sync/progress/ProgressMessage"
import type { DeadlineView, LivesView, ProgressView } from "./HubPort"

/**
 * The lives as a player on the hub reads them, from a book the hub makes when its race starts: nothing is
 * known before, and what the book tells is told from the moment it is followed.
 */
export class LivesFollow implements LivesView {


    public readonly livesChanged = signal<{ readonly id: string, readonly lives: number }>()
    public readonly eliminated = signal<string>()


    public livesOf(id: string): number|null {
        return this.#book?.livesOf(id) ?? null
    }

    public alive(): readonly string[] {
        return this.#book?.alive() ?? []
    }

    /** Read the lives of this book from now on, in place of the one followed. */
    public follow(book: LivesView): void {
        this.#unfollow()
        this.#book = book
        this.#observers = [
            book.livesChanged.add(change => this.livesChanged.notify(change)),
            book.eliminated.add(id => this.eliminated.notify(id)),
        ]
    }

    /** Stop following. */
    public dispose(): void {
        this.#unfollow()
    }


    #book: LivesView|null = null
    #observers: Observer[] = []

    #unfollow(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers = []
        this.#book = null
    }
}

/** The time limit of a mode that has none: nothing runs, and nothing comes. */
export class IdleDeadline implements DeadlineView {


    public readonly started = signal<number>()
    public readonly expired = signal<void>()


    public remaining(): null {
        return null
    }
}

/** The progress of a mode where the players have no journey: nobody stands anywhere. */
export class IdleProgress implements ProgressView {


    public readonly progressed = signal<{ readonly id: string, readonly progress: Progress }>()


    public progressOf(): null {
        return null
    }
}
