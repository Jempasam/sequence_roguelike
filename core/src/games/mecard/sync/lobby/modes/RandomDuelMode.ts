import type { Battle } from "../../../sim/battle/Battle"
import { LANCER_KIT, SWORDSMAN_KIT } from "../../../sim/catalog/kits"
import { duelSave, partyUnits } from "../../../sim/duel/duelBattle"
import type { DuelParty } from "../../../sim/duel/duelBattle"
import { Run } from "../../../sim/run/Run"
import { loadBattle } from "../../../sim/save/battleSave"
import type { BattleSave } from "../../../sim/save/battleSave"

import { BattleDriver } from "../../battle/BattleDriver"
import { BattleGuest } from "../../battle/BattleGuest"
import type { GameMode, GameModeContext, GameModeDef, Me, GameMember } from "../../mode/GameMode"
import type { GameBench } from "../../mode/gameModeAsLobbyMode"
import { NO_PICK, OWN_UNITS, Seats } from "../../run/Seats"

/** How long the players read who won before the next duel, in ms. */
export const RANDOM_DUEL_PAUSE_MS = 3_000

/** How often a game with too few players looks again for some, in ms. */
export const RANDOM_DUEL_LOOK_MS = 2_000

/** What a random duel asks of the screen, which it knows nothing of. */
export interface DuelBench extends GameBench {
    /**
     * Show a battle to this player: it plans the units it is given and says it is ready, and only watches
     * with
     * none.
     *
     * @param ready - Said when the player is ready.
     */
    showBattle(battle: Battle, units: readonly string[], ready: () => void): void

    /** Take the battle off the screen: the player waits for the next. */
    hideBattle(): void
}

/** What a player is given when it controls a duel: the units it plays. */
interface DuelInfo {
    readonly units: readonly string[]
}

/** What the manager holds of the duel being fought. */
interface Fought {
    readonly driver: BattleDriver
    readonly fighters: readonly GameMember[]
    readonly handle: ReturnType<GameModeContext["openManagedBattle"]>
}

function infoOf(info: unknown): DuelInfo {
    const units = (info as { units?: unknown }|null)?.units
    return { units: Array.isArray(units) ? units.filter((unit): unit is string => typeof unit === "string") : [] }
}

/**
 * Two players of the game fight a duel at random, one after the other, while the others watch it: a mode as
 * small
 * as can be, which holds no run and no network, and tells what the runner is for.
 */
class RandomDuel implements GameMode {


    constructor(private readonly bench: DuelBench){}


    // ===== The manager =====

    public async run(ctx: GameModeContext): Promise<void> {
        // A player that comes while a duel is fought watches it.
        ctx.joined.add(who => {
            const fought = this.#fought
            if(fought && !fought.fighters.some(each => each.id === who.id)) fought.handle.spectate(who)
        })
        for(;;){
            const fighters = await this.#pickTwo(ctx)
            await this.#fight(ctx, fighters)
        }
    }

    public onLeave(_ctx: GameModeContext, who: GameMember, gone: boolean): void {
        const host = this.#fought?.driver.host
        if(!host || !this.#fought?.fighters.some(each => each.id === who.id)) return
        if(gone) host.gone(who.id)
        else host.lost(who.id)
        this.#fought.driver.step()
    }

    public onBack(_ctx: GameModeContext, who: GameMember): void {
        this.#fought?.driver.host.back(who.id)
    }

    // ===== The owner of the duel, and its replicas =====

    public createRun(): Run {
        throw new Error("A random duel holds no run.")
    }

    public createBattle(spec: unknown): Battle {
        return loadBattle(spec as BattleSave)
    }

    public onBattleIntent(from: GameMember, _info: unknown, battle: Battle, intent: unknown): boolean {
        const driver = this.#fought?.driver
        if(!driver || driver.battle !== battle) return false
        const { seats } = driver
        // A player on the very battle of the manager committed already: it only says it is ready.
        const owes = battle.awaited.units.some(unit => seats.holderOf(unit.name) === from.id)
        if(owes) driver.host.receive(from.id, JSON.stringify(intent))
        else driver.host.committed(from.id)
        return true
    }

    // ===== The player =====

    public onShowBattle(me: Me, battle: Battle, info: unknown): void {
        const { units } = infoOf(info)
        const guest = units.length === 0 ? null : new BattleGuest(
            battle,
            { send: text => me.intent(battle, JSON.parse(text)), listen: () => ({ dispose: () => {} }) },
            () => units,
        )
        this.bench.showBattle(battle, units, () => guest?.ready())
    }

    public onHide(): void {
        this.bench.hideBattle()
    }


    #fought: Fought|null = null

    /** Two players that are connected, drawn among those that play; wait for them when there are fewer. */
    async #pickTwo(ctx: GameModeContext): Promise<readonly GameMember[]> {
        for(;;){
            const pool = ctx.members().filter(each => each.presence === "player" && each.connected)
            if(pool.length >= 2){
                const first = pool.splice(ctx.rng().int(pool.length), 1)[0]
                return [first, pool[ctx.rng().int(pool.length)]]
            }
            await Promise.race([
                ctx.until(ctx.joined, () => true),
                new Promise<void>(resolve => ctx.after(RANDOM_DUEL_LOOK_MS, resolve)),
            ])
        }
    }

    async #fight(ctx: GameModeContext, fighters: readonly GameMember[]): Promise<void> {
        const parties = fighters.map((each): DuelParty => ({ name: each.id, units: teamUnits() }))
        let save: BattleSave
        try {
            save = duelSave(parties.map(party => [party]), ctx.rng().int(2 ** 31))
        } catch(error){
            ctx.report(`Le duel n'a pas pu être fait : ${String(error)}`)
            await new Promise<void>(resolve => ctx.after(RANDOM_DUEL_PAUSE_MS, resolve))
            return
        }
        const handle = ctx.openManagedBattle(save)
        const battle = handle.battle()
        if(!battle) return
        const seats = new Seats(OWN_UNITS, NO_PICK)
        const names = save.units.map(unit => unit.name)
        let offset = 0
        for(const party of parties){
            seats.assign(party.name, names.slice(offset, offset + party.units.length))
            offset += party.units.length
        }
        const driver = new BattleDriver(battle, seats)
        this.#fought = { driver, fighters, handle }
        driver.faulted.add(fault => ctx.report(fault.describe()))
        const ended = Promise.race([ctx.until(driver.over, () => true), ctx.until(driver.failed, () => true)])
        for(const member of ctx.members()){
            const played = fighters.some(each => each.id === member.id)
            if(played) handle.control(member, { units: seats.unitsOf(member.id) } satisfies DuelInfo)
            else handle.spectate(member)
        }
        ctx.announce(`${fighters[0].name} affronte ${fighters[1].name}`)
        driver.begin()
        const outcome = await ended
        const winner = "winner" in outcome ? outcome.winner : null
        const camp = /^Camp (\d+)$/.exec(winner?.name ?? "")
        ctx.announce(camp ? `Vainqueur : ${fighters[Number(camp[1]) - 1]?.name ?? "?"}` : "Égalité")
        await new Promise<void>(resolve => ctx.after(RANDOM_DUEL_PAUSE_MS, resolve))
        driver.dispose()
        this.#fought = null
        handle.close()
    }
}

/** The team each player brings: the heroes of a new party, which is all there is to bring here. */
function teamUnits() {
    const run = new Run(0)
    run.hire(LANCER_KIT)
    run.hire(SWORDSMAN_KIT)
    return partyUnits(run)
}

/** The mode of the random duels. */
export function randomDuelMode(bench: DuelBench): GameModeDef {
    return {
        id: "duel-aleatoire",
        title: "Duel aléatoire",
        description: "Un duel rapide, chacun avec une équipe tirée au hasard.",
        settings: [],
        create: () => new RandomDuel(bench),
    }
}
