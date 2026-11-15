import { closest, normalize, UsageError } from "./errors"

/** What a column of the table shows of the battles of a row: the winrate, or one count of them. */
export const STATS = [
    "winrate", "n", "ci", "draws", "timeouts", "rounds", "errors", "wins", "softwins", "losses", "softlosses",
] as const
export type Stat = typeof STATS[number]

/** What is shown besides the columns, and wants none of its own: the battles of every row, pooled in a last row. */
const GENERAL = ["total"] as const

/** What `--out` asks for: the columns of the table, and the outputs that belong to no column. */
export interface Outputs {
    readonly columns: readonly Stat[]

    /** Is a last row added, with every battle of the table? */
    readonly total: boolean
}

/** The columns shown when `--out` does not say. */
export const DEFAULT_OUTPUTS = "winrate"

/**
 * Read `--out`: the columns, each a statistic of the battles of a row, and the general outputs (`total`).
 *
 * @throws {@link UsageError} On an output that is neither, a column asked twice, or no column at all.
 */
export function parseOutputs(items: readonly string[]): Outputs {
    const columns: Stat[] = []
    let total = false
    for(const item of items){
        const word = normalize(item)
        if((GENERAL as readonly string[]).includes(word)){
            if(total) throw new UsageError(`--out : « ${item} » est demandé deux fois.`)
            total = true
            continue
        }
        const stat = STATS.find(each => each === word)
        if(stat === undefined){
            const near = closest(word, [...STATS, ...GENERAL])
            const hint = near.length > 0 ? ` Vouliez-vous ${near.map(name => `« ${name} »`).join(", ")} ?` : ""
            throw new UsageError(
                `--out : « ${item} » n'est ni une colonne ni une sortie générale.${hint} Colonnes : ${STATS.join(", ")}. Générales : ${GENERAL.join(", ")}.`,
            )
        }
        if(columns.includes(stat)) throw new UsageError(`--out : « ${item} » est demandé deux fois.`)
        columns.push(stat)
    }
    if(columns.length === 0) throw new UsageError(`--out : aucune colonne (${STATS.join(", ")}) : total seul n'a rien à réunir.`)
    return { columns, total }
}
