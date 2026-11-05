import { describe, expect, test } from "vitest"
import { Console, tokensOf } from "@game/core"
import type { Command, CommandContext } from "@game/core"

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
})
