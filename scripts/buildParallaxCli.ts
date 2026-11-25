// Builds one painting in its own process, so renderArt.ts can build several at once. Called by renderArt.ts:
//   node scripts/buildParallaxCli.ts <folder> <out.ora> <picture.js> <preview|nopreview> <asset folders, joined by the path delimiter>

import { delimiter } from "node:path"

import { buildParallax } from "./buildParallax.ts"

const [folder, out, picture, preview, assets] = process.argv.slice(2)
try {
    await buildParallax(folder, out, assets.split(delimiter), picture, preview === "preview")
} catch(error){
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
}
