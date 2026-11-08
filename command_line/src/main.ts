import { CATALOGS } from "./catalogs"
import type { Catalog } from "./catalogs"
import { sim, UsageError } from "./sim"

const USAGE = `Usage :
  npm run cli -- catalogs                       les catalogues et leur taille
  npm run cli -- list <catalogue> [--desc]      les noms, ou "Nom: description"
  npm run cli -- list all [--desc]              tous les catalogues, groupés
  npm run cli -- sim [options]                  combats aléatoires en masse (sim --help)
Catalogues : ${CATALOGS.map(catalog => catalog.name).join(", ")}`

/** What a catalog prints: a name per line, or `Name: description`. */
function lines(catalog: Catalog, withDescription: boolean): string[] {
    return catalog.entries().map(entry => withDescription ? `${entry.name}: ${entry.description}` : entry.name)
}

function fail(message: string): never {
    console.error(message)
    process.exit(1)
}

function list(args: readonly string[]): void {
    const flags = args.filter(arg => arg.startsWith("--"))
    const words = args.filter(arg => !arg.startsWith("--"))
    if(flags.includes("--help") || words[0] === "help"){
        console.log(USAGE)
        return
    }
    const unknown = flags.find(flag => flag !== "--desc")
    if(unknown !== undefined) fail(`Option inconnue : ${unknown}\n${USAGE}`)

    const [command, target] = words
    if(command === "catalogs"){
        for(const catalog of CATALOGS) console.log(`${catalog.name} ${catalog.entries().length}`)
        return
    }
    if(command === "list" && target !== undefined){
        const withDescription = flags.includes("--desc")
        if(target === "all"){
            console.log(CATALOGS.map(catalog => {
                const entries = lines(catalog, withDescription)
                return [`# ${catalog.name} (${entries.length})`, ...entries].join("\n")
            }).join("\n\n"))
            return
        }
        const catalog = CATALOGS.find(candidate => candidate.name === target)
        if(catalog === undefined){
            fail(`Catalogue inconnu : ${target}. Disponibles : ${CATALOGS.map(candidate => candidate.name).join(", ")}`)
        }
        console.log(lines(catalog, withDescription).join("\n"))
        return
    }
    fail(USAGE)
}

/** `sim` has its own options: it reads its arguments itself. */
async function main(args: readonly string[]): Promise<void> {
    if(args[0] === "sim"){
        try {
            const output = await sim(args.slice(1))
            if(output !== "") console.log(output)
        }
        catch(error){
            if(error instanceof UsageError) fail(error.message)
            throw error
        }
        return
    }
    list(args)
}

main(process.argv.slice(2))
