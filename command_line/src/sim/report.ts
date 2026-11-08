import { UsageError } from "./errors"
import { decided, margin, meanRounds, played, winrate } from "./stats"
import type { Tally } from "./stats"

/** What a cell may show besides the winrate. */
export const SHOWN = [
    "n", "ci", "draws", "timeouts", "rounds", "errors", "wins", "softwins", "losses", "softlosses",
] as const
export type Shown = typeof SHOWN[number]

export const FORMATS = ["table", "csv", "json"] as const
export type Format = typeof FORMATS[number]

/** A table of tallies: a row for each fighter, a column for each output, none where a cell makes no sense. */
export interface Matrix {
    /** What the table is of, when several are printed. */
    readonly title: string|null
    readonly rows: readonly string[]
    readonly columns: readonly string[]
    readonly cells: readonly (readonly (Tally|null)[])[]
}

export interface Presentation {
    readonly show: readonly Shown[]

    /** The column the rows are sorted by, `name` for the names, none for the total or the first column. */
    readonly sort: string|null

    /** The first rows kept, or the last ones when negative. */
    readonly top: number|null
    readonly flip: boolean
    readonly format: Format
}

function transposed(matrix: Matrix): Matrix {
    return {
        title: matrix.title,
        rows: matrix.columns,
        columns: matrix.rows,
        cells: matrix.columns.map((_, column) => matrix.rows.map((__, row) => matrix.cells[row][column])),
    }
}

/**
 * The matrix as it is presented: flipped if asked, its rows sorted, cut to the first or the last.
 *
 * @throws {@link UsageError} When `--sort` names no column.
 */
export function arranged(matrix: Matrix, presentation: Presentation): Matrix {
    const source = presentation.flip ? transposed(matrix) : matrix
    const order = source.rows.map((_, index) => index)
    const wanted = presentation.sort?.toLowerCase() ?? null
    if(wanted === "name"){
        order.sort((first, second) => source.rows[first].localeCompare(source.rows[second]))
    }
    else {
        const named = wanted === null
            ? -1
            : source.columns.findIndex(column => column.toLowerCase() === wanted)
        if(wanted !== null && named < 0){
            throw new UsageError(`--sort : colonne « ${presentation.sort} » inconnue. Colonnes : name, ${source.columns.join(", ")}.`)
        }
        const total = source.columns.findIndex(column => column.toLowerCase() === "total")
        const column = named >= 0 ? named : Math.max(total, 0)
        const rate = (row: number): number => {
            const cell = source.cells[row][column]
            return (cell && winrate(cell)) ?? -1
        }
        order.sort((first, second) => rate(second) - rate(first))
    }
    const top = presentation.top
    const kept = top === null ? order : top > 0 ? order.slice(0, top) : order.slice(top)
    return {
        title: source.title,
        rows: kept.map(index => source.rows[index]),
        columns: source.columns,
        cells: kept.map(index => source.cells[index]),
    }
}

function percent(value: number): string {
    return `${(value * 100).toFixed(1)}%`
}

/** What a cell shows besides the winrate, a field as a bare number. */
function valueOf(tally: Tally, field: Shown): string {
    switch(field){
        case "n": return String(played(tally))
        case "ci": {
            const half = margin(tally)
            return half === null ? "?" : (half * 100).toFixed(1)
        }
        case "draws": return String(tally.draws)
        case "timeouts": return String(tally.timeouts)
        case "rounds": return (meanRounds(tally) ?? 0).toFixed(1)
        case "errors": return String(tally.errors)
        case "wins": return String(tally.wins)
        case "softwins": return String(tally.softWins)
        case "losses": return String(tally.losses)
        case "softlosses": return String(tally.softLosses)
    }
}

/** What a field is called in a cell of the table. */
function labelled(field: Shown, value: string): string {
    switch(field){
        case "ci": return `±${value}`
        case "draws": return `nuls=${value}`
        default: return `${field}=${value}`
    }
}

function cellText(tally: Tally|null, show: readonly Shown[]): string {
    if(tally === null) return "-"
    const rate = winrate(tally)
    return [rate === null ? "-" : percent(rate), ...show.map(field => labelled(field, valueOf(tally, field)))].join(" ")
}

function pad(text: string, width: number, right: boolean): string {
    return right ? text.padStart(width) : text.padEnd(width)
}

function asTable(matrix: Matrix, show: readonly Shown[]): string {
    const header = ["", ...matrix.columns]
    const body = matrix.rows.map((row, index) => {
        return [row, ...matrix.cells[index].map(cell => cellText(cell, show))]
    })
    const widths = header.map((_, column) => Math.max(...[header, ...body].map(line => line[column].length)))
    const line = (cells: readonly string[]) => cells.map((cell, column) => pad(cell, widths[column], column > 0)).join("  ").trimEnd()
    const rule = widths.map(width => "-".repeat(width)).join("  ")
    return [...matrix.title === null ? [] : [`# ${matrix.title}`], line(header), rule, ...body.map(line)].join("\n")
}

function csvField(text: string): string {
    return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text
}

function asCsv(matrices: readonly Matrix[], show: readonly Shown[]): string {
    const lines: string[] = []
    const headed = matrices.some(matrix => matrix.title !== null)
    const first = matrices[0]
    const names = first.columns.flatMap(column => ["", ...show.map(field => ` ${field}`)].map(suffix => `${column}${suffix}`))
    lines.push([...headed ? ["ia"] : [], "nom", ...names].map(csvField).join(","))
    for(const matrix of matrices){
        matrix.rows.forEach((row, index) => {
            const cells = matrix.cells[index].flatMap(cell => {
                if(cell === null) return ["", ...show.map(() => "")]
                const rate = winrate(cell)
                return [rate === null ? "" : (rate * 100).toFixed(1), ...show.map(field => valueOf(cell, field))]
            })
            lines.push([...headed ? [matrix.title ?? ""] : [], row, ...cells].map(csvField).join(","))
        })
    }
    return lines.join("\n")
}

function asJson(matrices: readonly Matrix[]): string {
    const tables = matrices.map(matrix => ({
        ai: matrix.title,
        columns: matrix.columns,
        rows: matrix.rows.map((name, index) => ({
            name,
            cells: matrix.cells[index].map(cell => cell && {
                winrate: winrate(cell),
                margin: margin(cell),
                wins: cell.wins,
                softWins: cell.softWins,
                losses: cell.losses,
                softLosses: cell.softLosses,
                draws: cell.draws,
                timeouts: cell.timeouts,
                battles: played(cell),
                decided: decided(cell),
                meanRounds: meanRounds(cell),
                errors: cell.errors,
            }),
        })),
    }))
    return JSON.stringify(tables.length === 1 ? tables[0] : tables, null, 2)
}

/** Print the matrices, one after the other. */
export function render(matrices: readonly Matrix[], presentation: Presentation): string {
    const shown = matrices.map(matrix => arranged(matrix, presentation))
    switch(presentation.format){
        case "csv": return asCsv(shown, presentation.show)
        case "json": return asJson(shown)
        case "table": return shown.map(matrix => asTable(matrix, presentation.show)).join("\n\n")
    }
}
