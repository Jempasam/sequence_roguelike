/** The characters of a line that are no word: they separate commands and group what they share. */
const META = /([;<>])/g

/**
 * The words of a line, split on spaces, `;`, `<` and `>` each being a word of its own.
 *
 * @param typing - Is the line being typed? An empty word is then added at its end when it ends on a space
 * or on a symbol, the word being typed.
 */
export function lexLine(line: string, typing = false): string[] {
    const words = line.replace(META, " $1 ").trim().split(/\s+/).filter(word => word.length > 0)
    const last = words.at(-1)
    if(typing && (last === undefined || /\s$/.test(line) || last === ";" || last === "<" || last === ">")) words.push("")
    return words
}

/** The commands a part of a line makes: a few words in a row, or the alternatives of a group. */
type Part = string[][]

/**
 * Develop a line into the commands it stands for, each as its words.
 *
 * @remarks
 * `;` ends a command. `<` opens a group whose alternatives are separated by `;`, and `>` closes it: what
 * comes before the group and after it is shared by every alternative. A group left open runs to the end of
 * the line.
 * Groups may hold groups, and a command may hold several: every combination is made, in order.
 *
 * - `battle < create 50 50 ; edit a` is `battle create 50 50` and `battle edit a`.
 * - `battle create <50 50; 100 100> Archère` is `battle create 50 50 Archère` and
 *   `battle create 100 100 Archère`.
 *
 * @param typing - Is the line being typed? See {@link lexLine}.
 * @throws {@link Error} On a `>` that closes nothing, or a group or an alternative that holds nothing.
 */
export function expandLine(line: string, typing = false): string[][] {
    const tokens = lexLine(line, typing)
    let at = 0

    /** A command, up to its `;`, its `>` or the end: the product of its parts. */
    const command = (): string[][] => {
        const parts: Part[] = []
        let words: string[] = []
        const flush = (): void => {
            if(words.length > 0) parts.push([words])
            words = []
        }
        while(at < tokens.length){
            const token = tokens[at]
            if(token === ";" || token === ">") break
            at++
            if(token === "<"){
                flush()
                parts.push(group())
            }
            else words.push(token)
        }
        flush()
        return parts.reduce<string[][]>(
            (made, part) => made.flatMap(before => part.map(after => [...before, ...after])), [[]])
    }

    /** A group, its `<` being next: every alternative, up to its `>` or the end. */
    const group = (): Part => {
        const alternatives: string[][] = []
        while(true){
            const alternative = command()
            if(alternative.every(words => words.length === 0)){
                throw new Error("Un groupe < > ne doit pas avoir d'alternative vide.")
            }
            alternatives.push(...alternative)
            const token = tokens[at]
            if(token === undefined) break
            at++
            if(token === ">") break
        }
        return alternatives
    }

    const commands: string[][] = []
    while(at < tokens.length){
        if(tokens[at] === ">") throw new Error("Un > ne ferme aucun <.")
        commands.push(...command().filter(words => words.length > 0))
        if(tokens[at] === ";") at++
    }
    return commands
}
