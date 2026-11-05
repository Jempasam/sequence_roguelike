import { Sprite, Texture } from "../../../../engine/gpu"
import type { Gpu } from "../../../../engine/gpu"
import { BitmapFont } from "../../../../engine/text"
import type { Glyph } from "../../../../engine/text"

/** The width of a cell of the font, the letter and the space after it, in pixels. */
const CELL_WIDTH = 4

/** The height of a cell: a row for the accents, 5 for the letter, one below for the cedilla, one free. */
const CELL_HEIGHT = 8

/** How many cells a row of the sheet holds. */
const COLUMNS = 32

/** The row of a cell the letter starts at, below the accents. */
const LETTER_TOP = 1

/** The size of the white square under the glyphs, for the flat fills. */
const WHITE_SIZE = 4

/**
 * The letters, 3 pixels wide and 5 high, its 5 rows from the top, `#` for ink. Small capitals: the lower
 * case letters are drawn with them.
 */
const LETTERS: Readonly<Record<string, string>> = {
    "A": ".#. #.# ### #.# #.#", "B": "##. #.# ##. #.# ##.", "C": ".## #.. #.. #.. .##",
    "D": "##. #.# #.# #.# ##.", "E": "### #.. ##. #.. ###", "F": "### #.. ##. #.. #..",
    "G": ".## #.. #.# #.# .##", "H": "#.# #.# ### #.# #.#", "I": "### .#. .#. .#. ###",
    "J": "..# ..# ..# #.# .#.", "K": "#.# #.# ##. #.# #.#", "L": "#.. #.. #.. #.. ###",
    "M": "#.# ### ### #.# #.#", "N": "##. #.# #.# #.# #.#", "O": ".#. #.# #.# #.# .#.",
    "P": "##. #.# ##. #.. #..", "Q": ".#. #.# #.# ##. .##", "R": "##. #.# ##. #.# #.#",
    "S": ".## #.. .#. ..# ##.", "T": "### .#. .#. .#. .#.", "U": "#.# #.# #.# #.# ###",
    "V": "#.# #.# #.# #.# .#.", "W": "#.# #.# ### ### #.#", "X": "#.# #.# .#. #.# #.#",
    "Y": "#.# #.# .#. .#. .#.", "Z": "### ..# .#. #.. ###",
    "0": "### #.# #.# #.# ###", "1": ".#. ##. .#. .#. ###", "2": "##. ..# .#. #.. ###",
    "3": "##. ..# .#. ..# ##.", "4": "#.# #.# ### ..# ..#", "5": "### #.. ##. ..# ##.",
    "6": ".## #.. ### #.# ###", "7": "### ..# .#. .#. .#.", "8": "### #.# ### #.# ###",
    "9": "### #.# ### ..# ##.",
    ".": "... ... ... ... .#.", ",": "... ... ... .#. #..", ":": "... .#. ... .#. ...",
    ";": "... .#. ... .#. #..", "!": ".#. .#. .#. ... .#.", "?": "##. ..# .#. ... .#.",
    "'": ".#. .#. ... ... ...", "\"": "#.# #.# ... ... ...", "-": "... ... ### ... ...",
    "+": "... .#. ### .#. ...", "(": "..# .#. .#. .#. ..#", ")": "#.. .#. .#. .#. #..",
    "[": ".## .#. .#. .#. .##", "]": "##. .#. .#. .#. ##.", "/": "..# ..# .#. #.. #..",
    "<": "..# .#. #.. .#. ..#", ">": "#.. .#. ..# .#. #..", "=": "... ### ... ### ...",
    "%": "#.# ..# .#. #.. #.#", "×": "... #.# .#. #.# ...", "*": "#.# .#. #.# ... ...",
    "_": "... ... ... ... ###", "…": "... ... ... ... #.#", "♥": "#.# ### ### .#. ...",
    "·": "... ... .#. ... ...", "✓": "... ..# ..# #.# .#.", "Œ": "### ##. ### ##. ###",
    "&": ".#. #.# .#. #.# .##", "|": ".#. .#. .#. .#. .#.", "°": ".#. #.# .#. ... ...",
    "−": "... ... ### ... ...", "«": "... .#. #.. .#. ...", "»": "... .#. ..# .#. ...",
}

/** The accent marks, over the letter, 3 pixels wide. */
const ACCENTS: Readonly<Record<string, string>> = { acute: "..#", grave: "#..", circumflex: ".#.", diaeresis: "#.#" }

/** The accented letters: their letter and their mark, the cedilla below. */
const ACCENTED: Readonly<Record<string, readonly [string, string]>> = {
    "É": ["E", "acute"], "È": ["E", "grave"], "Ê": ["E", "circumflex"], "Ë": ["E", "diaeresis"],
    "À": ["A", "grave"], "Â": ["A", "circumflex"], "Ä": ["A", "diaeresis"], "Ù": ["U", "grave"],
    "Û": ["U", "circumflex"], "Ü": ["U", "diaeresis"], "Î": ["I", "circumflex"], "Ï": ["I", "diaeresis"],
    "Ô": ["O", "circumflex"], "Ö": ["O", "diaeresis"], "Ç": ["C", "cedilla"],
}

/** A font and the white square drawn next to it, on one texture, so a text and its frame batch together. */
export interface PixelFont {
    readonly font: BitmapFont
    readonly white: Sprite
}

/**
 * The font of the game, drawn from the letters above into a texture: no image to load, and the same pixels
 * on every platform.
 */
export function pixelFont(gpu: Gpu): PixelFont {
    const characters = [...Object.keys(LETTERS), ...Object.keys(ACCENTED)]
    const rows = Math.ceil(characters.length / COLUMNS)
    const width = COLUMNS * CELL_WIDTH
    const height = rows * CELL_HEIGHT + WHITE_SIZE
    const data = new Uint8Array(width * height * 4)
    const ink = (x: number, y: number) => data.set([255, 255, 255, 255], (y * width + x) * 4)
    characters.forEach((character, index) => {
        const left = index % COLUMNS * CELL_WIDTH
        const top = Math.floor(index / COLUMNS) * CELL_HEIGHT
        drawCharacter(character, (x, y) => ink(left + x, top + y))
    })
    for(let y = 0; y < WHITE_SIZE; y++) for(let x = 0; x < WHITE_SIZE; x++) ink(x, rows * CELL_HEIGHT + y)
    const texture = Texture.fromPixels(gpu, { width, height, data })
    const glyphs = new Map<string, Glyph>()
    characters.forEach((character, index) => {
        const x = index % COLUMNS * CELL_WIDTH
        const y = Math.floor(index / COLUMNS) * CELL_HEIGHT
        const sprite = new Sprite(texture, x, y, CELL_WIDTH, CELL_HEIGHT)
        const glyph = { sprite, advance: CELL_WIDTH, offsetX: 0, offsetY: 0 }
        glyphs.set(character, glyph)
        const lower = character.toLowerCase()
        if(lower !== character) glyphs.set(lower, glyph)
    })
    glyphs.set(" ", { sprite: null, advance: CELL_WIDTH, offsetX: 0, offsetY: 0 })
    const fallback = glyphs.get("?")
    if(!fallback) throw new Error("The font lacks its fallback \"?\".")
    const font = new BitmapFont({ glyphs, fallback, lineHeight: CELL_HEIGHT, baseline: LETTER_TOP + 5 })
    return { font, white: new Sprite(texture, 0, rows * CELL_HEIGHT, WHITE_SIZE, WHITE_SIZE) }
}

/** Ink the pixels of a character, in the coordinates of its cell. */
function drawCharacter(character: string, ink: (x: number, y: number) => void): void {
    const accented = ACCENTED[character]
    const drawing = LETTERS[accented ? accented[0] : character]
    const rows = drawing?.split(" ") ?? []
    if(rows.length !== 5 || rows.some(row => row.length !== 3)){
        throw new Error(`The drawing of "${character}" is not 5 rows of 3 pixels.`)
    }
    rows.forEach((row, y) => {
        for(let x = 0; x < 3; x++) if(row[x] === "#") ink(x, LETTER_TOP + y)
    })
    if(!accented) return
    const mark = accented[1]
    if(mark === "cedilla"){
        ink(1, LETTER_TOP + 5)
        return
    }
    const accent = ACCENTS[mark]
    for(let x = 0; x < accent.length; x++) if(accent[x] === "#") ink(x, 0)
}
