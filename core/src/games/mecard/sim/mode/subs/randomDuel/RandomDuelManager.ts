import { LANCER_KIT, SWORDSMAN_KIT } from "../../../catalog/kits"
import { duelSave, partyUnits } from "../../../duel/duelBattle"
import type { DuelParty } from "../../../duel/duelBattle"
import { Run } from "../../../run/Run"
import type { BattleSave } from "../../../save/battleSave"
import type { GameMember } from "../../GameMember"
import type { GameModeManager } from "../../GameMode"
import type { GameModeContext } from "../../GameModeContext"
import type { GameModeShareable } from "../../GameModeShareable"
import type { DuelOrder, DuelSaid } from "../duel/DuelOwner"

/** How long the players read who won before the next duel, in ms. */
export const RANDOM_DUEL_PAUSE_MS = 3_000

/** How often a game with too few players looks again for some, in ms. */
export const RANDOM_DUEL_LOOK_MS = 2_000

/**
 * Two players of the game fight a duel at random, one after the other, while the others watch it: a mode as
 * small as can be, which holds no run, no battle and no network.
 *
 * @remarks
 * A fighter that leaves or loses its connection is replaced by bots: the game does it, the mode hears of
 * nothing.
 */
export class RandomDuelManager implements GameModeManager {


    public async run(ctx: GameModeContext): Promise<void> {
        for(;;){
            const fighters = await this.#pickTwo(ctx)
            await this.#fight(ctx, fighters)
        }
    }


    /** Two players that are connected, drawn among those there are; wait for them when there are fewer. */
    async #pickTwo(ctx: GameModeContext): Promise<readonly GameMember[]> {
        for(;;){
            const pool = ctx.members().filter(each => each.connected)
            if(pool.length >= 2){
                const first = pool.splice(ctx.rng().int(pool.length), 1)[0]
                return [first, pool[ctx.rng().int(pool.length)]]
            }
            await Promise.race([ctx.until(ctx.joined, () => true), ctx.sleep(RANDOM_DUEL_LOOK_MS)])
        }
    }

    async #fight(ctx: GameModeContext, fighters: readonly GameMember[]): Promise<void> {
        const parties = fighters.map((each): DuelParty => ({ name: each.id, units: teamUnits() }))
        let save: BattleSave
        try {
            save = duelSave(parties.map(party => [party]), ctx.rng().int(2 ** 31))
        } catch(error){
            ctx.report(`Le duel n'a pas pu être fait : ${String(error)}`)
            await ctx.sleep(RANDOM_DUEL_PAUSE_MS)
            return
        }
        const names = save.units.map(unit => unit.name)
        const units: Record<string, readonly string[]> = {}
        let offset = 0
        for(const party of parties){
            units[party.name] = names.slice(offset, offset + party.units.length)
            offset += party.units.length
        }
        // The first fighter owns the duel: it holds the battle, plays its own units and plays the rounds.
        const handle = ctx.openBattle(fighters[0], save as unknown as GameModeShareable)
        const said = new Promise<DuelSaid>(resolve => {
            handle.said.add(message => resolve(message as DuelSaid))
        })
        const gone = new Promise<DuelSaid>(resolve => {
            handle.invalidated.add(() => resolve({ failed: "Le propriétaire du duel est parti." }))
        })
        for(const fighter of fighters.slice(1)) handle.play(fighter, units[fighter.id])
        // The others watch it, those that come while it is fought too.
        handle.spectateAll()
        ctx.announce(`${fighters[0].name} affronte ${fighters[1].name}`)
        handle.notify({ start: units } satisfies DuelOrder)
        const outcome = await Promise.race([said, gone])
        if(outcome.failed !== undefined){
            // The owner left: the duel is over for it, which loses, and the other fighter wins.
            const left = !ctx.members().some(each => each.id === fighters[0].id)
            if(left) ctx.announce(`Vainqueur : ${fighters[1].name}`)
            else ctx.report(outcome.failed)
        } else {
            const camp = /^Camp (\d+)$/.exec(outcome.over?.winner ?? "")
            ctx.announce(camp ? `Vainqueur : ${fighters[Number(camp[1]) - 1]?.name ?? "?"}` : "Égalité")
        }
        await ctx.sleep(RANDOM_DUEL_PAUSE_MS)
        handle.close()
    }
}

/** The team each player brings: the heroes of a new party, which is all there is to bring here. */
export function teamUnits() {
    const run = new Run(0)
    run.hire(LANCER_KIT)
    run.hire(SWORDSMAN_KIT)
    return partyUnits(run)
}
