/** A value type of WebAssembly, by its name in the text format. */
export type WasmType = "i32" | "i64" | "f32" | "f64" | "v128" | "funcref" | "externref"

/** What a module exports under one name. */
export type WasmExport =
    | { readonly kind: "function", readonly name: string, readonly params: readonly WasmType[],
        readonly results: readonly WasmType[] }
    | { readonly kind: "global" | "memory" | "table" | "tag", readonly name: string }

/** The exports of a module, with the type of each function, and what it imports. */
export interface WasmSignatures {
    readonly exports: readonly WasmExport[]

    /** Each import as `module.name`. */
    readonly imports: readonly string[]
}

const VALUE_TYPES: Readonly<Record<number, WasmType>> = {
    0x7f: "i32", 0x7e: "i64", 0x7d: "f32", 0x7c: "f64", 0x7b: "v128", 0x70: "funcref", 0x6f: "externref",
}

const EXTERNAL_KINDS = ["function", "table", "memory", "global", "tag"] as const

const SECTION = { type: 1, import: 2, function: 3, export: 7 } as const

/** The magic number and the version 1, which open every module. */
const HEADER_LENGTH = 8

/**
 * Read the exports and the imports of a module from its binary.
 *
 * `WebAssembly.Module.exports` names the exports without their types, so the sections are read here. Only
 * what a module compiled from C holds is understood: function types without GC, and MVP limits.
 */
export function signaturesOf(wasm: Uint8Array): WasmSignatures {
    const reader = new Reader(wasm, HEADER_LENGTH)
    const types: { params: WasmType[], results: WasmType[] }[] = []
    const functionTypes: number[] = []
    const imports: string[] = []
    const exports: { kind: typeof EXTERNAL_KINDS[number], name: string, index: number }[] = []
    while(!reader.done){
        const id = reader.byte()
        const end = reader.u32() + reader.at
        switch(id){
            case SECTION.type:
                reader.repeat(() => {
                    if(reader.byte() !== 0x60) throw new Error("Only plain function types are understood.")
                    const params = reader.repeat(() => reader.valueType())
                    types.push({ params, results: reader.repeat(() => reader.valueType()) })
                })
                break
            case SECTION.import:
                reader.repeat(() => {
                    imports.push(`${reader.name()}.${reader.name()}`)
                    const kind = reader.byte()
                    if(kind === 0) functionTypes.push(reader.u32())
                    else reader.skipImportDescription(kind)
                })
                break
            case SECTION.function:
                reader.repeat(() => functionTypes.push(reader.u32()))
                break
            case SECTION.export:
                reader.repeat(() => {
                    const name = reader.name()
                    exports.push({ name, kind: EXTERNAL_KINDS[reader.byte()], index: reader.u32() })
                })
                break
            default:
                break
        }
        reader.at = end
    }
    return {
        imports,
        exports: exports.map(({ kind, name, index }) => {
            if(kind !== "function") return { kind, name }
            const type = types[functionTypes[index]]
            return { kind, name, params: type.params, results: type.results }
        }),
    }
}


//// Binary ////

// No parameter properties: Node strips the types of these files when a script runs them, and cannot
// strip those.
class Reader {


    public readonly bytes: Uint8Array

    /** The offset of the next byte to read. */
    public at: number

    constructor(bytes: Uint8Array, at: number){
        this.bytes = bytes
        this.at = at
    }

    public get done(): boolean {
        return this.at >= this.bytes.length
    }

    public byte(): number {
        return this.bytes[this.at++]
    }

    /** An unsigned LEB128. */
    public u32(): number {
        let value = 0
        for(let shift = 0; ; shift += 7){
            const byte = this.byte()
            value += (byte & 0x7f) * 2 ** shift
            if(byte < 0x80) return value
        }
    }

    public name(): string {
        const length = this.u32()
        this.at += length
        return new TextDecoder().decode(this.bytes.subarray(this.at - length, this.at))
    }

    public valueType(): WasmType {
        const code = this.byte()
        const type = VALUE_TYPES[code]
        if(!type) throw new Error(`Unknown value type 0x${code.toString(16)}.`)
        return type
    }

    /** Read a vector: its length, then each item. */
    public repeat<T>(item: () => T): T[] {
        return Array.from({ length: this.u32() }, item)
    }

    /** Skip what follows the kind of an import that is not a function. */
    public skipImportDescription(kind: number): void {
        switch(kind){
            case 1:
                this.byte()
                this.#limits()
                break
            case 2:
                this.#limits()
                break
            case 3:
                this.byte()
                this.byte()
                break
            case 4:
                this.byte()
                this.u32()
                break
            default:
                throw new Error(`Unknown import kind ${kind}.`)
        }
    }

    #limits(): void {
        const flags = this.byte()
        this.u32()
        if(flags & 1) this.u32()
    }
}
