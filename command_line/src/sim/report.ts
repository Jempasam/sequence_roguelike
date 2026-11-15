import { UsageError } from "./errors"
import type { Stat } from "./outputs"
import { decided, margin, meanRounds, mergeTallies, played, winrate } from "./stats"
import type { Tally } from "./stats"

export const FORMATS = ["table", "csv", "json"] as const
export type Format = typeof FORMATS[number]

/** A table of tallies: a row for each battle described, what each column shows being read from its tally. */
export interface Matrix {
    /** What the table is of, when several are printed. */
    readonly title: string|null
    readonly rows: readonly string[]
    readonly tallies: readonly Tally[]
}

export interface Presentation {
    /** The columns, in the order shown. */
    readonly columns: readonly Stat[]

    /** Is a last row added with every battle of the table pooled? */
    readonly total: boolean

    /** The column the rows are sorted by, `name` for the names, none for the first column. */
    readonly sort: string|null

    /** The first rows kept, or the last ones when negative. */
    readonly top: number|null

    /** Are the rows written as columns, and the columns as rows? */
    readonly flip: boolean
    readonly format: Format
}

/** What a statistic of a tally is, none when no battle gives it. */
function numberOf(tally: Tally, stat: Stat): number|null {
    switch(stat){
        case "winrate": return winrate(tally)
        case "n": return played(tally)
        case "ci": {
            const half = margin(tally)
            return half === null ? null : half * 100
        }
        case "draws": return tally.draws
        case "timeouts": return tally.timeouts
        case "rounds": return meanRounds(tally)
        case "errors": return tally.errors
        case "wins": return tally.wins
        case "softwins": return tally.softWins
        case "losses": return tally.losses
        case "softlosses": return tally.softLosses
    }
}

/** A statistic as it is written in a cell of the table. */
function textOf(tally: Tally, stat: Stat): string {
    const value = numberOf(tally, stat)
    if(value === null) return "-"
    switch(stat){
        case "winrate": return `${(value * 100).toFixed(1)}%`
        case "ci": return `±${value.toFixed(1)}`
        case "rounds": return value.toFixed(1)
        default: return String(value)
    }
}

/**
 * The matrix as it is presented: its rows sorted, then cut to the first or the last.
 *
 * @throws {@link UsageError} When `--sort` names no column.
 */
export function arranged(matrix: Matrix, presentation: Presentation): Matrix {
    const order = matrix.rows.map((_, index) => index)
    const wanted = presentation.sort?.toLowerCase() ?? null
    if(wanted === "name"){
        order.sort((first, second) => matrix.rows[first].localeCompare(matrix.rows[second]))
    }
    else {
        const stat = wanted === null ? presentation.columns[0] : presentation.columns.find(column => column === wanted)
        if(stat === undefined){
            throw new UsageError(`--sort : colonne « ${presentation.sort} » inconnue. Colonnes : name, ${presentation.columns.join(", ")}.`)
        }
        const value = (row: number): number => numberOf(matrix.tallies[row], stat) ?? -1
        order.sort((first, second) => value(second) - value(first))
    }
    const top = presentation.top
    const kept = top === null ? order : top > 0 ? order.slice(0, top) : order.slice(top)
    return {
        title: matrix.title,
        rows: kept.map(index => matrix.rows[index]),
        tallies: kept.map(index => matrix.tallies[index]),
    }
}

/** A matrix as it is presented, and the battles of all its rows, those cut away by `--top` included. */
interface Shown {
    readonly matrix: Matrix
    readonly pooled: Tally
}

/** The lines of a matrix as text, the total last when asked, a header first. */
function gridOf({ matrix, pooled }: Shown, presentation: Presentation): string[][] {
    const rows = [...matrix.rows]
    const tallies = [...matrix.tallies]
    if(presentation.total && tallies.length > 0){
        rows.push("total")
        tallies.push(pooled)
    }
    const header = ["", ...presentation.columns]
    const body = rows.map((row, index) => [row, ...presentation.columns.map(stat => textOf(tallies[index], stat))])
    const grid = [header, ...body]
    return presentation.flip ? header.map((_, column) => grid.map(line => line[column])) : grid
}

function pad(text: string, width: number, right: boolean): string {
    return right ? text.padStart(width) : text.padEnd(width)
}

function asTable(shown: Shown, presentation: Presentation): string {
    const [header, ...body] = gridOf(shown, presentation)
    const widths = header.map((_, column) => Math.max(...[header, ...body].map(line => line[column].length)))
    const line = (cells: readonly string[]) => cells.map((cell, column) => pad(cell, widths[column], column > 0)).join("  ").trimEnd()
    const rule = widths.map(width => "-".repeat(width)).join("  ")
    return [...shown.matrix.title === null ? [] : [`# ${shown.matrix.title}`], line(header), rule, ...body.map(line)].join("\n")
}

function csvField(text: string): string {
    return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text
}

function asCsv(shown: readonly Shown[], presentation: Presentation): string {
    const headed = shown.some(each => each.matrix.title !== null)
    const lines: string[] = []
    const [header] = gridOf(shown[0], presentation)
    lines.push([...headed ? ["ia"] : [], "nom", ...header.slice(1)].map(csvField).join(","))
    for(const each of shown){
        const [, ...body] = gridOf(each, presentation)
        for(const cells of body){
            const raw = cells.map((cell, at) => at === 0 ? cell : cell.replace(/[%±]/g, "").replace(/^-$/, ""))
            lines.push([...headed ? [each.matrix.title ?? ""] : [], ...raw].map(csvField).join(","))
        }
    }
    return lines.join("\n")
}

function asJson(shown: readonly Shown[], presentation: Presentation): string {
    const tables = shown.map(({ matrix, pooled }) => {
        const rows = [...matrix.rows]
        const tallies = [...matrix.tallies]
        if(presentation.total && tallies.length > 0){
            rows.push("total")
            tallies.push(pooled)
        }
        return {
            ai: matrix.title,
            columns: presentation.columns,
            rows: rows.map((name, index) => ({
                name,
                cells: presentation.columns.map(stat => numberOf(tallies[index], stat)),
                detail: {
                    wins: tallies[index].wins,
                    softWins: tallies[index].softWins,
                    losses: tallies[index].losses,
                    softLosses: tallies[index].softLosses,
                    draws: tallies[index].draws,
                    timeouts: tallies[index].timeouts,
                    battles: played(tallies[index]),
                    decided: decided(tallies[index]),
                    errors: tallies[index].errors,
                },
            })),
        }
    })
    return JSON.stringify(tables.length === 1 ? tables[0] : tables, null, 2)
}

/** Print the matrices, one after the other. */
export function render(matrices: readonly Matrix[], presentation: Presentation): string {
    const shown = matrices.map(matrix => ({ matrix: arranged(matrix, presentation), pooled: mergeTallies(matrix.tallies) }))
    switch(presentation.format){
        case "csv": return asCsv(shown, presentation)
        case "json": return asJson(shown, presentation)
        case "table": return shown.map(each => asTable(each, presentation)).join("\n\n")
    }
}
