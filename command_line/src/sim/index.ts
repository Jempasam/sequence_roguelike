import { UsageError } from "./errors"
import { HELP_TOPICS, helpText } from "./help"
import { planOf } from "./options"
import { render } from "./report"
import { run, SYSTEM_CONSOLE } from "./run"
import type { Console } from "./run"

export { choiceOf, integerOf, listOf, parseArgs, valueOf, valuesOf } from "./args"
export type { OptionSpec, ParsedArgs } from "./args"
export { loadDefinitions, NO_DEFINITIONS } from "./define"
export type { DefinedKit, Definitions, HeartGroup } from "./define"
export { closest, normalize, UsageError, unknownName } from "./errors"
export { fight } from "./fight"
export type { Combatant, FightResult, FightSpec } from "./fight"
export { Roster } from "./fighters"
export type { Body, Fighter } from "./fighters"
export { planOf } from "./options"
export type { Plan } from "./options"
export { parseOutputs } from "./outputs"
export type { Atom, OutputColumn } from "./outputs"
export { arranged, render } from "./report"
export type { Matrix, Presentation } from "./report"
export { run } from "./run"
export type { Console } from "./run"
export { playGame } from "./scenario"
export type { Setup } from "./scenario"
export { parseStrategy, STRATEGIES } from "./strategies"
export type { Strategy } from "./strategies"
export { addBattle, decided, emptyTally, margin, meanRounds, mergeTallies, played, winrate } from "./stats"
export type { Outcome, Tally } from "./stats"

/** How many failed effects of a kind are named after the table. */
const LISTED_FAILURES = 5

/**
 * Run `sim` with its arguments: what it prints is returned, what it warns about goes to the console.
 *
 * @throws {@link UsageError} When the command line is wrong.
 */
export async function sim(args: readonly string[], io: Console = SYSTEM_CONSOLE): Promise<string> {
    const help = args.indexOf("--help")
    if(help >= 0){
        const topic = args[help + 1]
        if(topic !== undefined && !topic.startsWith("--") && !HELP_TOPICS.includes(topic)){
            throw new UsageError(`--help : « ${topic} » inconnu. Sujets : ${HELP_TOPICS.join(", ")}.`)
        }
        return helpText(topic !== undefined && !topic.startsWith("--") ? topic : null)
    }
    const plan = await planOf(args)
    for(const warning of plan.warnings) io.error(`sim : ${warning}`)
    const { matrices, failures, cancelled } = await run(plan, io)
    if(cancelled) return ""
    const output = render(matrices, plan.presentation)
    if(failures.size > 0){
        const total = [...failures.values()].reduce((sum, count) => sum + count, 0)
        io.error(`sim : ${total} effet(s) ont échoué pendant les combats (leurs résultats sont comptés) :`)
        const commonest = [...failures].sort((first, second) => second[1] - first[1])
        for(const [message, count] of commonest.slice(0, LISTED_FAILURES)){
            io.error(`  ${count} × ${message}`)
        }
        if(failures.size > LISTED_FAILURES) io.error(`  … et ${failures.size - LISTED_FAILURES} autre(s) message(s).`)
    }
    return output
}
