import { SABOTAGES } from "../../../duel/sabotage"
import type { SavedUnit } from "../../../save/battleSave"
import { teamFault } from "../../../../sync/TeamRequest"
import type { GameMember } from "../../GameMember"
import type { GameModeContext } from "../../GameModeContext"
import type { GameModeShareable } from "../../GameModeShareable"
import { RangeSetting } from "../../Setting"
import { Picker, PickerClient } from "../choose/Picker"
import type { PromptBench } from "../choose/Picker"
import type { DraftContext } from "../draft/DraftMode"
import { tournamentKind } from "../tournament/TournamentMode"
import type { TeamPhase, TeamPhaseClient, TournamentBench } from "../tournament/TournamentMode"

/** The key of the questions put to a saboteur. */
export const SABOTAGE_KEY = "prompt-sabotage"

/** What a tournament with saboteurs asks of the screen. */
export type SabotageBench = TournamentBench & PromptBench

/** The option that does nothing, so a saboteur may spare the fighters. */
export const SPARE = "Épargner"

/**
 * The phase of a tournament in which the members that do not fight take turns at sabotaging: before each
 * game, one of them chooses what to do to which fighter, among what {@link SABOTAGES} offers, or spares them.
 * It changes no team before that, and a team a sabotage would make unloadable is fought as it was.
 *
 * @remarks
 * The one that sabotages is the next of those that watch, in turn, so everyone out of the match gets a say in
 * time and no game waits for more than one answer.
 */
export class Saboteurs implements TeamPhase {


    constructor(private readonly seconds: number){}


    public async prepare(): Promise<ReadonlyMap<string, readonly SavedUnit[]>> {
        return new Map()
    }

    public async adjust(
        ctx: GameModeContext, fighters: readonly GameMember[], watchers: readonly GameMember[],
        teams: readonly (readonly SavedUnit[])[],
    ): Promise<readonly (readonly SavedUnit[])[]> {
        const here = watchers.filter(each => each.connected)
        if(here.length === 0) return teams
        const picker = this.#picker ??= new Picker(ctx, SABOTAGE_KEY)
        const saboteur = here[this.#turn++ % here.length]
        // What may be done, by what it is written as: "Blessure : Ana", and the one that does nothing.
        const doings = new Map<string, { sabotage: number, fighter: number }>()
        SABOTAGES.forEach((sabotage, index) => fighters.forEach((fighter, target) => {
            doings.set(`${sabotage.name} : ${fighter.name}`, { sabotage: index, fighter: target })
        }))
        const chosen = await picker.ask(saboteur, [SPARE, ...doings.keys()], this.seconds * 1000, "Sabote un combattant")
        const doing = chosen ? doings.get(chosen.choice) : undefined
        // A saboteur that did not answer spares the fighters: nothing is drawn for it.
        if(!doing || chosen?.drawn) return teams
        const changed = SABOTAGES[doing.sabotage].apply(teams[doing.fighter])
        if(teamFault(fighters[doing.fighter].id, changed)){
            ctx.report("Le sabotage n'a pas pu être fait : l'équipe n'est plus valide.")
            return teams
        }
        ctx.announce(`${saboteur.name} sabote ${fighters[doing.fighter].name} : ${SABOTAGES[doing.sabotage].name}`)
        return teams.map((units, index) => index === doing.fighter ? changed : units)
    }


    #picker: Picker|null = null
    #turn = 0
}

/** What a client does for the saboteurs: show the question put to it. */
export class SaboteursClient implements TeamPhaseClient {


    constructor(bench: SabotageBench){
        this.#picker = new PickerClient(bench, () => ({ picks: {} } satisfies DraftContext), SABOTAGE_KEY)
    }


    public onOrder(message: GameModeShareable): void {
        this.#picker.onOrder(message)
    }

    public onAsk(message: GameModeShareable): Promise<GameModeShareable>|undefined {
        return this.#picker.onAsk(message)
    }


    readonly #picker: PickerClient
}

/** The mode of the tournaments with saboteurs. */
export function sabotageMode(bench: SabotageBench) {
    return tournamentKind(bench, {
        id: "tournoi-sabotage",
        title: "Tournoi des saboteurs",
        description:
            "Un tournoi où ceux qui ne se battent pas peuvent, avant chaque manche, blesser ou désarmer un combattant.",
        settings: [
            new RangeSetting("manches", "Manches à gagner par match", 1, 3, 1, 1),
            new RangeSetting("delai", "Secondes pour saboter", 5, 30, 5, 10),
        ],
        games: values => Number(values.manches),
        phase: values => new Saboteurs(Number(values.delai)),
        client: () => new SaboteursClient(bench),
    })
}
