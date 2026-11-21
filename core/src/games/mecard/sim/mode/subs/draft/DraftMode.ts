import { ALL_KITS } from "../../../catalog/kits"
import type { Kit } from "../../../catalog/kits"
import { unitsOfKits } from "../../../duel/kitTeam"
import type { SavedUnit } from "../../../save/battleSave"
import type { GameMember } from "../../GameMember"
import type { GameModeContext } from "../../GameModeContext"
import type { GameModeShareable } from "../../GameModeShareable"
import { RangeSetting } from "../../Setting"
import { Picker, PickerClient, PROMPT_KEY } from "../choose/Picker"
import type { PromptBench } from "../choose/Picker"
import { tournamentKind } from "../tournament/TournamentMode"
import type { TeamPhase, TeamPhaseClient, TournamentBench } from "../tournament/TournamentMode"

import { DraftBoard } from "./DraftBoard"

/** The key of the state that holds what each player took, which every client is told as it stands. */
export const PICKS_KEY = "picks"

/** What a draft asks of the screen. */
export type DraftBench = TournamentBench & PromptBench

/** What a draft tells the screen besides the options of a pick: what each player took, by its id. */
export interface DraftContext {
    readonly picks: Readonly<Record<string, readonly string[]>>
}

/** How a draft is set up. */
export interface DraftRules {
    /** How many kits each player picks. */
    readonly each: number

    /** How many kits the pool holds. */
    readonly pool: number

    /** How long a player has to pick, in seconds. */
    readonly seconds: number
}

/**
 * The phase of a tournament in which the players pick their kits in turn, in a snake order, from a pool of
 * kits drawn at random; their team is the kits they took. A player that does not pick in time, or is not
 * there, has a kit drawn for it.
 *
 * @remarks
 * What asks a player to pick is a {@link Picker}, so the draft writes nothing of a question or its timer.
 */
export class KitDraft implements TeamPhase {


    constructor(private readonly rules: DraftRules){}


    public async prepare(
        ctx: GameModeContext, players: readonly GameMember[],
    ): Promise<ReadonlyMap<string, readonly SavedUnit[]>> {
        const picker = new Picker(ctx, PROMPT_KEY)
        const names = this.#drawPool(ctx)
        const board = new DraftBoard(players.map(each => each.id), names, this.rules.each)
        const publish = (): void => ctx.publish(PICKS_KEY, board.view(null).picks as unknown as GameModeShareable)
        publish()
        for(let who = board.turn; who !== null; who = board.turn){
            const member = players.find(each => each.id === who) as GameMember
            // The member may have left since the turn before: it is read again, and not asked when it is gone.
            const here = ctx.members().some(each => each.id === member.id && each.connected)
            const chosen = await picker.ask(
                member, board.pool, this.rules.seconds * 1000, "Choisis un kit", here,
            )
            if(chosen === null) break
            board.pick(who, chosen.choice)
            if(chosen.drawn) ctx.announce(`${member.name} n'a pas choisi : ${chosen.choice} lui est donné.`)
            publish()
        }
        const kits = new Map(ALL_KITS.map(kit => [kit.name, kit]))
        // A player that took no kit (the pool ran out) is left to the tournament's own team.
        return new Map(players.filter(each => board.picksOf(each.id).length > 0).map(each => [
            each.id,
            unitsOfKits(board.picksOf(each.id).map(name => kits.get(name) as Kit)),
        ]))
    }


    /** The names of the kits that may be picked: some of the catalog, drawn at random. */
    #drawPool(ctx: GameModeContext): string[] {
        const names = ALL_KITS.map(kit => kit.name)
        const rng = ctx.rng()
        for(let index = names.length - 1; index > 0; index--){
            const other = rng.int(index + 1)
            ;[names[index], names[other]] = [names[other], names[index]]
        }
        return names.slice(0, this.rules.pool)
    }
}

/** What a client does for a draft: show what each player took, and the question of each pick. */
export class KitDraftClient implements TeamPhaseClient {


    constructor(bench: DraftBench){
        this.#picker = new PickerClient(bench, () => ({ picks: this.#picks } satisfies DraftContext), PROMPT_KEY)
    }


    public onState(key: string, value: GameModeShareable): void {
        if(key === PICKS_KEY) this.#picks = (value ?? {}) as unknown as DraftContext["picks"]
    }

    public onOrder(message: GameModeShareable): void {
        this.#picker.onOrder(message)
    }

    public onAsk(message: GameModeShareable): Promise<GameModeShareable>|undefined {
        return this.#picker.onAsk(message)
    }


    readonly #picker: PickerClient
    #picks: DraftContext["picks"] = {}
}

/** The mode of the tournaments of picked kits. */
export function draftMode(bench: DraftBench) {
    return tournamentKind(bench, {
        id: "draft",
        title: "Draft de kits",
        description:
            "Chacun choisit ses kits à tour de rôle dans un pool commun, puis les équipes s'affrontent en tournoi.",
        settings: [
            new RangeSetting("kits", "Kits par joueur", 1, 4, 1, 2),
            new RangeSetting("pool", "Kits au choix", 6, 40, 2, 12),
            new RangeSetting("delai", "Secondes par choix", 5, 60, 5, 20),
            new RangeSetting("manches", "Manches à gagner par match", 1, 3, 1, 1),
        ],
        games: values => Number(values.manches),
        phase: values => new KitDraft({
            each: Number(values.kits),
            pool: Number(values.pool),
            seconds: Number(values.delai),
        }),
        client: () => new KitDraftClient(bench),
    })
}
