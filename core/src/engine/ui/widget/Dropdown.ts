import type { Layer } from "../Layer"
import type { Theme } from "../Theme"
import { Button } from "./Button"
import { ContextMenu } from "./ContextMenu"

/** An option of a dropdown: what it is known by, and what it says. */
export interface DropdownOption {
    readonly id: string
    readonly label: string
}

/**
 * A button showing the option chosen: a click opens the list of the options in a menu under it, and
 * choosing one shows it and tells it.
 */
export class Dropdown extends Button {


    /** What it does when an option is chosen in the menu, nothing when none. Setting `selected` does not. */
    public onSelect: ((id: string) => void)|null = null

    /**
     * @param layer - The layer the menu opens in, the popup layer in practice.
     * @throws {@link Error} When there is no option, or the selected one is not among them.
     */
    constructor(
        theme: Theme,
        layer: Layer,
        options: readonly DropdownOption[],
        selected: string = options[0]?.id ?? "",
    ){
        super(theme, "")
        this.#menu = new ContextMenu(theme, layer)
        this.#options = options
        this.#selected = this.#checked(selected)
        this.#show()
        this.onActivate = () => this.open()
    }


    /** The options, in order. Setting them keeps the selected one if still there, else takes the first. */
    public get options(): readonly DropdownOption[] { return this.#options }

    public set options(options: readonly DropdownOption[]){
        this.#options = options
        const kept = options.some(option => option.id === this.#selected)
        this.#selected = kept ? this.#selected : options[0]?.id ?? ""
        this.#show()
    }

    /** The id of the option chosen. */
    public get selected(): string { return this.#selected }

    /**
     * @throws {@link Error} When it is not the id of an option.
     */
    public set selected(id: string){
        this.#selected = this.#checked(id)
        this.#show()
    }

    /** Is its menu open? */
    public get isOpen(): boolean { return this.#menu.isOpen }

    /** Open the menu of the options under it. */
    public open(): void {
        this.#menu.entries = this.#options.map(option => ({
            label: option.label,
            action: () => {
                if(option.id === this.#selected) return
                this.#selected = option.id
                this.#show()
                this.onSelect?.(option.id)
            },
        }))
        this.#menu.open(this)
    }

    /** Close the menu. */
    public close(): void {
        this.#menu.close()
    }


    readonly #menu: ContextMenu
    #options: readonly DropdownOption[]
    #selected: string

    #checked(id: string): string {
        if(this.#options.length > 0 && !this.#options.some(option => option.id === id)){
            throw new Error(`The option ${id} is not one of the options of the dropdown.`)
        }
        return id
    }

    /** Show the label of the option chosen. */
    #show(): void {
        this.text = this.#options.find(option => option.id === this.#selected)?.label ?? ""
    }
}
