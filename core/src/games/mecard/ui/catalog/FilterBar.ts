import { Box, Toggle } from "../../../../engine/ui"
import type { Theme } from "../../../../engine/ui"

import type { EntryFilter } from "../library/entries"

/** The label of the toggle of what the player found. */
const UNLOCKED_LABEL = "Débloqué"

/**
 * A row of toggles, one for each filter offered, and when asked one for what the player found. It tells when
 * the player turns one over.
 */
export class FilterBar extends Box {


    /** What it does when a toggle is turned over, nothing when none. */
    public onChange: (() => void)|null = null

    /** @param withUnlocked - Does it offer to list only what the player found? */
    constructor(public readonly theme: Theme, withUnlocked = false){
        super("row", { gap: 2, align: "center" })
        if(withUnlocked){
            this.#unlockedToggle = new Toggle(theme, UNLOCKED_LABEL)
            this.#unlockedToggle.onChange = () => this.onChange?.()
        }
        this.#build()
    }


    /** The filters offered. Setting them keeps on those of them that were on. */
    public get filters(): readonly EntryFilter[] { return [...this.#toggles.keys()] }

    public set filters(filters: readonly EntryFilter[]){
        const on = new Set(this.active.map(filter => filter.id))
        this.#toggles.clear()
        for(const filter of filters){
            const toggle = new Toggle(this.theme, filter.label, on.has(filter.id))
            toggle.onChange = () => this.onChange?.()
            this.#toggles.set(filter, toggle)
        }
        this.#build()
    }

    /** The filters that are on. */
    public get active(): readonly EntryFilter[] {
        return [...this.#toggles].filter(([, toggle]) => toggle.value).map(([filter]) => filter)
    }

    /** Is the toggle of what the player found on? Never when it is not offered. */
    public get unlocked(): boolean { return this.#unlockedToggle?.value ?? false }

    public set unlocked(value: boolean){
        if(this.#unlockedToggle) this.#unlockedToggle.value = value
    }


    readonly #toggles = new Map<EntryFilter, Toggle>()
    #unlockedToggle: Toggle|null = null

    /** Put the toggles in the row again. */
    #build(): void {
        for(const child of [...this.children]) this.remove(child)
        if(this.#unlockedToggle) this.add(this.#unlockedToggle)
        for(const toggle of this.#toggles.values()) this.add(toggle)
    }
}
