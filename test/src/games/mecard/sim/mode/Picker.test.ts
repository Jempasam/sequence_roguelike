import { Rng } from "@game/core/mecard"
import { NoAnswerFault, Picker, PickerClient } from "@game/core/mecard/sync"
import type { GameMember, GameModeContext, GameModeShareable, Prompt, PromptBench } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

const ana: GameMember = { id: "a", name: "Ana", connected: true, options: {} }

/** A context whose channel to the member answers what the test gives, and keeps what was said. */
function context(answer: (message: GameModeShareable, timeoutMs?: number) => unknown) {
    const said: GameModeShareable[] = []
    const asked: GameModeShareable[] = []
    const ctx = {
        channel: () => ({
            notify: (message: GameModeShareable) => void said.push(message),
            ask: (message: GameModeShareable, timeoutMs?: number) => {
                asked.push(message)
                return Promise.resolve(answer(message, timeoutMs))
            },
        }),
        rng: () => new Rng(3),
    } as unknown as GameModeContext
    return { ctx, said, asked }
}

describe("the Picker, on the manager", () => {
    test("a member that picks an option → its choice, not drawn, asked with the time it has", async() => {
        const { ctx, asked } = context((_message, timeoutMs) => timeoutMs === 5000 ? "b" : "wrong")
        const chosen = await new Picker(ctx).ask(ana, ["a", "b"], 5000, "Choisis")
        expect(chosen).toEqual({ choice: "b", drawn: false })
        expect(asked[0]).toMatchObject({ who: "a", options: ["a", "b"], ms: 5000, title: "Choisis" })
    })

    test("an answer that is not an option → drawn among them, the list may be stale", async() => {
        const { ctx } = context(() => "zzz")
        const chosen = await new Picker(ctx).ask(ana, ["a", "b"], 1000, "t")
        expect(chosen?.drawn).toBe(true)
        expect(["a", "b"]).toContain(chosen?.choice)
    })

    test("no answer in time → drawn, and the prompt still shown is closed", async() => {
        const { ctx, said, asked } = context(() => new NoAnswerFault("too slow", "timeout"))
        const chosen = await new Picker(ctx).ask(ana, ["a", "b"], 1000, "t")
        expect(chosen?.drawn).toBe(true)
        const id = (asked[0] as unknown as Prompt).id
        expect(said).toEqual([{ unprompt: id, key: "prompt" }])
    })

    test("a member that is not there → drawn at once, nothing asked", async() => {
        const { ctx, asked } = context(() => "a")
        const chosen = await new Picker(ctx).ask(ana, ["a"], 1000, "t", false)
        expect(chosen).toEqual({ choice: "a", drawn: true })
        expect(asked).toEqual([])
    })

    test("no options → none, and each question has its own number", async() => {
        const { ctx, asked } = context(() => "a")
        const picker = new Picker(ctx)
        expect(await picker.ask(ana, [], 1000, "t")).toBeNull()
        await picker.ask(ana, ["a"], 1000, "t")
        await picker.ask(ana, ["a"], 1000, "t")
        expect((asked[0] as unknown as Prompt).id).not.toBe((asked[1] as unknown as Prompt).id)
    })
})

describe("the PickerClient, on a client", () => {
    function screen() {
        const shown: { prompt: Prompt, choose: (option: string) => void }[] = []
        let hidden = 0
        const bench: PromptBench = {
            showPrompt: (prompt, _context, choose) => void shown.push({ prompt, choose }),
            hidePrompt: () => void hidden++,
        }
        return { bench, shown, hidden: () => hidden }
    }
    const question = (key: string, id: number) => ({ key, id, who: "a", options: ["x", "y"], ms: 1000, title: "t" })

    test("a question of its key → shown, the answer is the option chosen, and the prompt is closed", async() => {
        const { bench, shown, hidden } = screen()
        const client = new PickerClient(bench, () => ({ picks: {} }))
        const answer = client.onAsk(question("prompt", 1))
        expect(shown).toHaveLength(1)
        shown[0].choose("y")
        expect(await answer).toBe("y")
        expect(hidden()).toBe(1)
    })

    test("a question of another key → left alone, for another part to answer", () => {
        const { bench, shown } = screen()
        const client = new PickerClient(bench, () => ({}), "mine")
        expect(client.onAsk(question("prompt", 1))).toBeUndefined()
        expect(client.onAsk("not a question")).toBeUndefined()
        expect(shown).toEqual([])
    })

    test("the manager gives up on the question shown → closed, an old one never closes a new one", () => {
        const { bench, hidden } = screen()
        const client = new PickerClient(bench, () => ({}))
        void client.onAsk(question("prompt", 2))
        client.onOrder({ unprompt: 1, key: "prompt" })
        expect(hidden()).toBe(0)
        client.onOrder({ unprompt: 2, key: "other" })
        expect(hidden()).toBe(0)
        client.onOrder({ unprompt: 2, key: "prompt" })
        expect(hidden()).toBe(1)
    })
})
