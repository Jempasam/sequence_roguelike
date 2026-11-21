import { LOOT_MONSTERS } from "../../../catalog/monsters"
import type { Monster } from "../../../catalog/monsters"
import { threatOf, unitsOfMonsters } from "../../../duel/monsterTeam"
import type { GameMember } from "../../GameMember"
import type { GameModeManager } from "../../GameMode"
import type { GameModeContext } from "../../GameModeContext"
import { lastOne } from "../../lastOne"
import { Settle } from "../../Settle"
import { Picker } from "../choose/Picker"
import { DuelStage } from "../duel/DuelStage"
import type { Combatant } from "../duel/DuelStage"
import { teamUnits } from "../randomDuel/RandomDuelManager"

/** How long the players read the end of an encounter before the next, in ms. */
export const MASTER_PAUSE_MS = 3_000

/** How long the players read how the game ended before they are back in the lobby, in ms. */
export const MASTER_LINGER_MS = 10_000

/** How long the manager waits for the clients of the lobby before it starts with those that joined, in ms. */
export const MASTER_JOIN_WAIT_MS = 10_000

/** How often a game with too few players looks again for some, in ms. */
export const MASTER_LOOK_MS = 2_000

/** What the master picks to end its choices and start the fight. */
export const LAUNCH = "Lancer le combat"

/** How a game with a master is set up. */
export interface MasterRules {
    /** How many encounters the heroes have to win. */
    readonly encounters: number

    /** What the master may spend on its first encounter, in threat. */
    readonly budget: number

    /** What it may spend more on each next one. */
    readonly growth: number

    /** How long it has to pick each monster, in seconds. */
    readonly seconds: number
}

/**
 * A game of a master against heroes: one member, the master, puts monsters in front of the others for some
 * encounters; the heroes win when they beat them all, the master when they fall once.
 *
 * @remarks
 * What it takes from shared parts: the master chooses by a {@link Picker}, a monster at a time, each one
 * costing its threat from a budget that grows with each encounter; the encounters are fought by a
 * {@link DuelStage} as a duel between two camps. The heroes are healed between encounters: each one is
 * fought with a team as new.
 */
export class DungeonMasterManager implements GameModeManager {


    constructor(private readonly rules: MasterRules){}


    public async run(ctx: GameModeContext): Promise<void> {
        const picker = new Picker(ctx)
        const [master, ...heroes] = await this.#gather(ctx)
        this.#isOn = true
        ctx.announce(`${master.name} est le maître du donjon, contre ${heroes.map(each => each.name).join(", ")}.`)
        let cleared = 0
        while(cleared < this.rules.encounters){
            const present = heroes.filter(each => this.#isHere(ctx, each))
            if(!this.#isHere(ctx, master) || present.length === 0) break
            const budget = this.rules.budget + this.rules.growth * cleared
            ctx.announce(`Rencontre ${cleared + 1}/${this.rules.encounters} : le maître a ${budget} de menace.`)
            const monsters = await this.#compose(ctx, picker, master, budget)
            const camps: Combatant[][] = [
                present.map(member => ({ member, units: teamUnits() })),
                [{ member: master, units: unitsOfMonsters(monsters, 1 + cleared) }],
            ]
            const won = await this.#stage.fightCamps(ctx, cleared, camps, handle => {
                const fighting = new Set([master.id, ...present.map(each => each.id)])
                for(const member of ctx.members()) if(!fighting.has(member.id)) handle.spectate(member)
            })
            await ctx.sleep(MASTER_PAUSE_MS)
            if(won !== 0) break
            cleared++
        }
        // A player left alone may have won it already: it is told once.
        if(!this.#ending.settle(cleared >= this.rules.encounters ? "heroes" : master.id)) return
        ctx.announce(cleared >= this.rules.encounters
            ? "Les héros ont vaincu le donjon !"
            : `Le maître ${master.name} a gagné : les héros sont tombés à la rencontre ${cleared + 1}.`)
        await ctx.sleep(MASTER_LINGER_MS)
        ctx.end()
    }


    /** A player that quits: the master alone, or one hero alone, wins. */
    public onQuit(ctx: GameModeContext): void {
        if(this.#isOn) lastOne(ctx, each => each.connected, this.#ending)
    }


    readonly #stage = new DuelStage()

    /** The end of the game, settled once: what the encounters came to, or the player left alone. */
    readonly #ending = new Settle<string|null>()
    #isOn = false

    /** The members that are connected: the first of them is the master, the others the heroes. */
    async #gather(ctx: GameModeContext): Promise<readonly GameMember[]> {
        let isLate = false
        void ctx.sleep(MASTER_JOIN_WAIT_MS).then(() => { isLate = true })
        for(;;){
            const pool = ctx.members().filter(each => each.connected)
            if(pool.length >= 2 && (pool.length >= ctx.expected() || isLate)) return pool
            await Promise.race([ctx.until(ctx.joined, () => true), ctx.sleep(MASTER_LOOK_MS)])
        }
    }

    #isHere(ctx: GameModeContext, member: GameMember): boolean {
        return ctx.members().some(each => each.id === member.id && each.connected)
    }

    /**
     * The monsters the master puts in front of the heroes: it picks one at a time among those its budget
     * still pays for, until it launches the fight, runs out of budget, or does not answer in time. One
     * monster at least stands, drawn when the master picked none.
     */
    async #compose(
        ctx: GameModeContext, picker: Picker, master: GameMember, budget: number,
    ): Promise<Monster[]> {
        const chosen: Monster[] = []
        let left = budget
        for(;;){
            const offers = LOOT_MONSTERS.filter(monster => threatOf(monster) <= left)
            if(offers.length === 0) break
            const options = new Map(offers.map(monster => [`${monster.name} (${threatOf(monster)})`, monster]))
            const title = `Menace : ${left}/${budget} · ${chosen.length} monstre(s)`
            const ms = this.rules.seconds * 1000
            const answer = await picker.ask(master, [LAUNCH, ...options.keys()], ms, title)
            // A master that does not answer in time launches the fight: nothing is drawn for it.
            if(!answer || answer.drawn || answer.choice === LAUNCH) break
            const monster = options.get(answer.choice)
            if(!monster) break
            chosen.push(monster)
            left -= threatOf(monster)
        }
        if(chosen.length === 0){
            const cheapest = LOOT_MONSTERS.filter(monster => threatOf(monster) <= budget)
            const pool = cheapest.length > 0 ? cheapest : LOOT_MONSTERS
            chosen.push(pool[ctx.rng().int(pool.length)])
        }
        return chosen
    }
}
