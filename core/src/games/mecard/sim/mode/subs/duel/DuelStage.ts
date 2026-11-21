import { duelSave } from "../../../duel/duelBattle"
import type { DuelParty } from "../../../duel/duelBattle"
import type { BattleSave, SavedUnit } from "../../../save/battleSave"

import type { GameMember } from "../../GameMember"
import type { GameModeContext } from "../../GameModeContext"
import type { GameModeShareable } from "../../GameModeShareable"

import type { DuelOrder, DuelSaid } from "./DuelOwner"

/** A duel being fought: who fights it, and the way to its battle. */
export interface Fought {
    readonly fighters: readonly GameMember[]
    readonly handle: ReturnType<GameModeContext["openBattle"]>
}

/** A member of a camp of a duel, and the units it brings to it. */
export interface Combatant {
    readonly member: GameMember
    readonly units: readonly SavedUnit[]
}

/**
 * The duels of a mode, as its manager has them fought: a battle its first fighter owns, played by the
 * fighters, watched by whoever the mode says. The clients show them with a {@link DuelClient}.
 *
 * @remarks
 * Hold one in the manager of the mode: it keeps the duels under way. A fighter that loses its connection,
 * comes back or leaves is told to the owner of the duel by the game itself.
 */
export class DuelStage {


    /** The duels under way, by the key they were fought under. */
    public get fights(): ReadonlyMap<string|number, Fought> {
        return this.#fights
    }

    // ===== The manager =====

    /**
     * Fight a duel between members, each with the units it brings, until it is over.
     *
     * @param key - Tells the duel from the others of the mode that are fought at the same time.
     * @param watchers - Told once the duel is open, to have the members that watch it follow it.
     * @returns The index of the fighter that won, none for a draw or a duel that could not be played.
     */
    public async fight(
        ctx: GameModeContext,
        key: string|number,
        fighters: readonly GameMember[],
        teams: readonly (readonly SavedUnit[])[],
        watchers: (handle: Fought["handle"]) => void,
    ): Promise<number|null> {
        const camps = fighters.map((member, index) => [{ member, units: teams[index] }])
        return this.fightCamps(ctx, key, camps, watchers)
    }

    /**
     * Fight a duel between camps of members, each with the units it brings, until it is over: the first
     * member
     * of the first camp owns the battle, and the others play their units on it.
     *
     * @returns The index of the camp that won, none for a draw or a duel that could not be played.
     */
    public async fightCamps(
        ctx: GameModeContext,
        key: string|number,
        camps: readonly (readonly Combatant[])[],
        watchers: (handle: Fought["handle"]) => void,
    ): Promise<number|null> {
        const combatants = camps.flat()
        const fighters = combatants.map(each => each.member)
        const parties = combatants.map(({ member, units }): DuelParty => ({ name: member.id, units }))
        let save: BattleSave
        try {
            const partyOf = ({ member, units }: Combatant): DuelParty => ({ name: member.id, units })
            const sides = camps.map(camp => camp.map(partyOf))
            save = duelSave(sides, ctx.rng().int(2 ** 31))
        } catch(error){
            ctx.report(`Le duel n'a pas pu être fait : ${String(error)}`)
            return null
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
        this.#fights.set(key, { fighters, handle })
        const said = new Promise<DuelSaid>(resolve => {
            handle.said.add(message => resolve(message as DuelSaid))
        })
        const gone = new Promise<DuelSaid>(resolve => {
            handle.invalidated.add(() => resolve({ failed: "Le propriétaire du duel est parti." }))
        })
        for(const fighter of fighters.slice(1)) handle.play(fighter, units[fighter.id])
        watchers(handle)
        handle.notify({ start: units } satisfies DuelOrder)
        const outcome = await Promise.race([said, gone])
        this.#fights.delete(key)
        handle.close()
        if(outcome.failed !== undefined){
            ctx.report(outcome.failed)
            // The owner left: the other camp wins, for the duel goes on without it.
            return fighters[0].connected || camps.length < 2 ? null : 1
        }
        const camp = /^Camp (\d+)$/.exec(outcome.over?.winner ?? "")
        return camp ? Number(camp[1]) - 1 : null
    }

    readonly #fights = new Map<string|number, Fought>()
}
