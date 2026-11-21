import { Rng } from "@game/core/mecard"
import { Bracket } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

/** Play a bracket to its end, the first of each match winning: who won, and how many matches were played. */
function playOut(bracket: Bracket): number {
    let played = 0
    for(let guard = 0; bracket.champion === null && guard < 100; guard++){
        for(const match of [...bracket.pending]){
            bracket.decide(match.id, match.first)
            played++
        }
    }
    return played
}

describe("the bracket", () => {
    test.each([2, 3, 4, 5, 7, 8, 13])("%i players → one champion, and as many fights as players out", count => {
        const players = Array.from({ length: count }, (_, index) => `p${index}`)
        const bracket = new Bracket(players, new Rng(count))
        const played = playOut(bracket)
        expect(bracket.champion).not.toBeNull()
        expect(players).toContain(bracket.champion)
        expect(played).toBe(count - 1)
    })

    test("an odd player goes through its round with no fight, and meets the winners after", () => {
        const bracket = new Bracket(["a", "b", "c"], new Rng(1))
        const [first] = bracket.rounds
        expect(first).toHaveLength(2)
        const bye = first.find(match => match.second === null)
        expect(bye?.winner).toBe(bye?.first)
        expect(bracket.pending).toHaveLength(1)
        const fight = bracket.pending[0]
        bracket.decide(fight.id, fight.first)
        expect(bracket.rounds).toHaveLength(2)
        const final = bracket.rounds[1][0]
        expect([final.first, final.second]).toContain(bye?.first)
    })

    test("a match decided twice, or won by a stranger, is refused", () => {
        const bracket = new Bracket(["a", "b", "c", "d"], new Rng(2))
        const match = bracket.pending[0]
        expect(() => bracket.decide(match.id, "z")).toThrow()
        bracket.decide(match.id, match.first)
        expect(() => bracket.decide(match.id, match.first)).toThrow()
    })

    test("the view names the rounds by how many matches they hold", () => {
        const bracket = new Bracket(["a", "b", "c", "d", "e", "f", "g", "h"], new Rng(3))
        playOut(bracket)
        expect(bracket.view().rounds.map(round => round.title)).toEqual(["Quarts de finale", "Demi-finales", "Finale"])
        expect(bracket.view().champion).toBe(bracket.champion)
    })
})
