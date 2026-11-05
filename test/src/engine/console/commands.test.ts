import { describe, expect, test } from "vitest"
import { command, Console, group, named, optional, whole } from "@game/core"
import type { Arg, Command, CommandContext } from "@game/core"

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

describe("command", () => {
    /** `set <fruit> [n]`: a fruit by its name, then a whole number, 1 by default. */
    function fruits(): Console<Counter> {
        const made = console()
        made.register("set", command("set <fruit> [n]", [
            named("le fruit", () => ["pomme", "poire"], fruit => fruit), optional(whole("le nombre", 1), 1),
        ], (ctx, fruit, amount) => ctx.print(`${fruit} ${amount}`)))
        return made
    }

    test("the arguments typed → read in order, each its own way", () => {
        const made = fruits()
        made.submit("set Poire 4")
        expect(made.lines.at(-1)?.text).toBe("poire 4")
    })

    test("an optional argument left out → its fallback", () => {
        const made = fruits()
        made.submit("set pomme")
        expect(made.lines.at(-1)?.text).toBe("pomme 1")
    })

    test("a word that names nothing → the error says what was looked for", () => {
        expect(fruits().check("set kiwi").error).toBe("Le fruit « kiwi » n'existe pas.")
    })

    test("too many words → not valid", () => {
        expect(fruits().check("set pomme 1 2").valid).toBe(false)
    })

    test("completing an argument → what it may be", () => {
        expect(fruits().suggestions("set p")).toEqual(["poire", "pomme"])
    })

    test("completing after a wrong word → nothing", () => {
        expect(fruits().suggestions("set kiwi ")).toEqual([])
    })

    test("an argument after another → completed from what the one before was read into", () => {
        const made = console()
        const letters: Arg<Counter, string> = named("la lettre", (_, [word]) => [...String(word ?? "")], letter => letter)
        const words: Arg<Counter, string> = named("le mot", () => ["abc"], word => word)
        made.register("pick", command("pick <mot> <lettre>", [words, letters], () => {}))
        expect(made.suggestions("pick abc ")).toEqual(["a", "b", "c"])
    })
})

describe("group", () => {
    /** `count <add|reset>`, over the counter. */
    function counting(): Console<Counter> {
        const made = console()
        made.register("count", group("count", "le compteur.", {
            add: ADD,
            reset: command("count reset", [], ctx => { ctx.value = 0 }),
        }))
        return made
    }

    test("a sub-command and its arguments → it runs", () => {
        const made = counting()
        made.submit("count add 5")
        expect(made.context.value).toBe(5)
    })

    test("the usage → the sub-commands listed, their own usage in the details", () => {
        const count = counting().commands.get("count")
        expect(count?.usage).toBe("count <add|reset> : le compteur.")
        expect(count?.details).toEqual(["add <n> : ajoute n.", "count reset"])
    })

    test("completing after the name → the sub-commands, then what the one typed offers", () => {
        const made = counting()
        expect(made.suggestions("count ")).toEqual(["add", "reset"])
        expect(made.suggestions("count add ")).toEqual(["1", "10", "100"])
    })

    test("no sub-command, or an unknown one → not valid", () => {
        const made = counting()
        expect(made.check("count").valid).toBe(false)
        expect(made.check("count nope").valid).toBe(false)
    })
})
