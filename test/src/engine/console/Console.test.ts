import { describe, expect, test } from "vitest"
import { Console, tokensOf } from "@game/core-src/engine/console/Console"
import { expandLine } from "@game/core-src/engine/console/expand"
import type { Command, CommandContext } from "@game/core-src/engine/console/Command"

// --- Fixture builders ---

/** What the test commands run with: a counter to change, and the console to print in. */
interface Counter extends CommandContext {
    value: number
}

/** `add <n>`: adds a whole number to the counter, offering 1, 10 and 100. */
const ADD: Command<Counter, number> = {
    usage: "add <n> : ajoute n.",
    complete: () => ["1", "10", "100"],
    parse: (_, args) => {
        const amount = Number(args[0])
        return args.length === 1 && Number.isInteger(amount) ? amount : new Error("add attend un nombre entier.")
    },
    execute: (ctx, amount) => {
        ctx.value += amount
        ctx.print(`valeur : ${ctx.value}`)
    },
}

/** `boom`: fails while running. */
const BOOM: Command<Counter, null> = {
    usage: "boom : échoue.",
    complete: () => [],
    parse: () => null,
    execute: () => { throw new Error("cassé") },
}

/** A console with `add` and `boom`, its counter at 0. */
function console(): Console<Counter> {
    // Printing goes to the console itself, which is made after its context.
    const counter: Counter = { value: 0, print: () => {} }
    const made = new Console(counter)
    counter.print = text => made.print(text)
    made.register("add", ADD)
    made.register("boom", BOOM)
    return made
}

// --- Tests ---

describe("tokensOf", () => {
    test("words and spaces → the words", () => {
        expect(tokensOf("  add   10 ")).toEqual(["add", "10"])
    })

    test("typing, a space at the end → an empty word being typed", () => {
        expect(tokensOf("add ", true)).toEqual(["add", ""])
    })
})

describe("Console.suggestions", () => {
    test("a name half typed → the names starting with it", () => {
        expect(console().suggestions("a")).toEqual(["add"])
    })

    test("a name and a space → what the command offers", () => {
        expect(console().suggestions("add ")).toEqual(["1", "10", "100"])
    })

    test("an argument half typed → what the command offers starting with it", () => {
        expect(console().suggestions("add 10")).toEqual(["10", "100"])
    })
})

describe("Console.completed", () => {
    test("a suggestion → the word being typed replaced, a space after", () => {
        expect(console().completed("add 1", "100")).toBe("add 100 ")
    })
})

describe("Console.check", () => {
    test("an unknown name → not known, not valid", () => {
        expect(console().check("nope")).toMatchObject({ known: false, valid: false })
    })

    test("a known name, wrong arguments → known, not valid, the error said", () => {
        expect(console().check("add x")).toMatchObject({ known: true, valid: false, error: "add attend un nombre entier." })
    })

    test("a known name, right arguments → valid", () => {
        expect(console().check("add 3").valid).toBe(true)
    })
})

describe("Console.submit", () => {
    test("a valid line → run, written as entered, then what it printed", () => {
        const made = console()
        made.submit("add 3")
        expect(made.context.value).toBe(3)
        expect(made.lines).toEqual([{ text: "add 3", kind: "command" }, { text: "valeur : 3", kind: "output" }])
    })

    test("the same line twice → once in the history", () => {
        const made = console()
        made.submit("add 1")
        made.submit("add 1")
        expect(made.history).toEqual(["add 1"])
    })

    test("a command that throws → the error written, the console still there", () => {
        const made = console()
        made.submit("boom")
        expect(made.lines.at(-1)).toEqual({ text: "cassé", kind: "error" })
    })

    test("an unknown name → an error, nothing run", () => {
        const made = console()
        made.submit("nope")
        expect(made.lines.at(-1)?.kind).toBe("error")
    })

    test("commands separated by ; → run in order", () => {
        const made = console()
        made.submit("add 1 ; add 10")
        expect(made.context.value).toBe(11)
    })

    test("a group → the shared start run with each alternative", () => {
        const made = console()
        made.submit("add < 1 ; 10 >")
        expect(made.context.value).toBe(11)
    })

    test("a failing command → the ones after it do not run", () => {
        const made = console()
        made.submit("add 1 ; boom ; add 10")
        expect(made.context.value).toBe(1)
        expect(made.lines.at(-1)).toEqual({ text: "[boom] cassé", kind: "error" })
    })

    test("a bad syntax → an error, nothing run", () => {
        const made = console()
        made.submit("add 1 ; add 2 >")
        expect(made.context.value).toBe(0)
        expect(made.lines.at(-1)?.kind).toBe("error")
    })
})

describe("expandLine", () => {
    test("; alone → the commands", () => {
        expect(expandLine("a 1 ; b 2;c")).toEqual([["a", "1"], ["b", "2"], ["c"]])
    })

    test("an open group → shared start, alternatives to the end", () => {
        expect(expandLine("battle < create 50 50 ; edit mannequin kit lancier")).toEqual([
            ["battle", "create", "50", "50"],
            ["battle", "edit", "mannequin", "kit", "lancier"],
        ])
        expect(expandLine("battle create < 50 50 ; 50 60")).toEqual([
            ["battle", "create", "50", "50"],
            ["battle", "create", "50", "60"],
        ])
    })

    test("a closed group → shared start and end, symbols stuck to words", () => {
        expect(expandLine("battle create <50 50; 100 100> Archère ally bot")).toEqual([
            ["battle", "create", "50", "50", "Archère", "ally", "bot"],
            ["battle", "create", "100", "100", "Archère", "ally", "bot"],
        ])
    })

    test("a ; after a closed group → ends the whole command", () => {
        expect(expandLine("a <b;c> d ; e")).toEqual([["a", "b", "d"], ["a", "c", "d"], ["e"]])
    })

    test("groups in groups or side by side → every combination", () => {
        expect(expandLine("a <b <1;2>; c> <x;y>")).toEqual([
            ["a", "b", "1", "x"], ["a", "b", "1", "y"], ["a", "b", "2", "x"], ["a", "b", "2", "y"],
            ["a", "c", "x"], ["a", "c", "y"],
        ])
    })

    test("a > closing nothing, an empty group or alternative → an error", () => {
        expect(() => expandLine("a >")).toThrow()
        expect(() => expandLine("a < >")).toThrow()
        expect(() => expandLine("a < b ; ; c")).toThrow()
    })

    test("typing → the word being typed ends the last command", () => {
        expect(expandLine("a < b ; c ", true)).toEqual([["a", "b"], ["a", "c", ""]])
    })
})

describe("Console with several commands", () => {
    test("suggestions → read from the last command", () => {
        expect(console().suggestions("add < 1 ; 10")).toEqual(["10", "100"])
    })

    test("check → the first command read, the others only by their name", () => {
        expect(console().check("add 1 ; add x").valid).toBe(true)
        expect(console().check("add 1 ; nope").known).toBe(false)
        expect(console().check("add x ; add 1").valid).toBe(false)
    })

    test("completed → the word being typed replaced inside a group", () => {
        expect(console().completed("add < 1 ; 10", "100")).toBe("add < 1 ; 100 ")
    })
})
