import type { FloorType, Monster, Rng } from "@game/core/mecard"

import type { Fighter, Roster } from "./fighters"
import { monsterFighter } from "./fighters"

/** What a source needs to say how many fights it offers: no draw. */
export interface SourceWorld {
    readonly roster: Roster

    /** Every fight of a biome the run can pick, in a fixed order, a fight being its monsters. */
    fightsOf(floor: FloorType): readonly (readonly Monster[])[]
}

/** What a source needs to give the members of one fight. */
export interface SourceDraw extends SourceWorld {
    readonly rng: Rng

    /** The kits and pets already in a team of the battle: `random:` avoids them as long as it can. */
    readonly taken: ReadonlySet<string>

    /** What `set:` saved in this battle, by name, for `get:` to give back: nothing outlives a battle. */
    readonly saved: Map<string, Fighter[]>
}

/** The text a fighter is taken by, to know who is already in a battle. */
export function takenKey(fighter: Fighter): string {
    return `${fighter.kind}:${fighter.name}`
}

/**
 * Where the members of a team come from: some number of fights, each giving the fighters that take part.
 *
 * @remarks
 * A source is read two ways: `count` says how many different fights it offers, and `get(index)` gives the
 * members of one of them. A row of the table walks one index of a source (`{…}`); a source that is not walked
 * must offer a single fight, which `random:` makes of any source.
 */
export interface Source {
    /** The source as it was written, without the braces that walk it. */
    readonly text: string

    /** How many different fights it offers. */
    count(world: SourceWorld): number

    /** The members of the fight number `index`, from 0 to `count - 1`. */
    get(index: number, draw: SourceDraw): Fighter[]
}

/** One fighter, a kit, a pet or a monster, named or defined in place. */
export class Named implements Source {

    constructor(public readonly text: string, private readonly fighter: Fighter){
    }

    public count(): number {
        return 1
    }

    public get(): Fighter[] {
        return [this.fighter]
    }
}

/** The members of each fight of a source, repeated: copies of the same fighters, not other draws. */
export class Repeat implements Source {

    constructor(public readonly text: string, private readonly inner: Source, private readonly copies: number){
    }

    public count(world: SourceWorld): number {
        return this.inner.count(world)
    }

    public get(index: number, draw: SourceDraw): Fighter[] {
        const members = this.inner.get(index, draw)
        return Array.from({ length: this.copies }, () => members).flat()
    }
}

/** A source that keeps what it gave in the battle, under a name, for `get:` to give it back. */
export class SetSource implements Source {

    constructor(public readonly text: string, private readonly name: string, private readonly inner: Source){
    }

    public count(world: SourceWorld): number {
        return this.inner.count(world)
    }

    public get(index: number, draw: SourceDraw): Fighter[] {
        const members = this.inner.get(index, draw)
        draw.saved.set(this.name, members)
        return members
    }
}

/** What `set:` kept under a name in this battle. */
export class GetSource implements Source {

    constructor(public readonly text: string, private readonly name: string){
    }

    public count(): number {
        return 1
    }

    public get(_index: number, draw: SourceDraw): Fighter[] {
        const members = draw.saved.get(this.name)
        if(members === undefined) throw new RangeError(`${this.text} : set:${this.name} n'a rien gardé dans ce combat.`)
        return members
    }
}

/** A group of fighters, one fight each. */
export class Group implements Source {

    constructor(public readonly text: string, private readonly members: readonly Fighter[]){
    }

    public count(): number {
        return this.members.length
    }

    public get(index: number): Fighter[] {
        return [this.members[index]]
    }
}

/** The fights of a biome, as many as its map holds in the layers and of the kind asked: a fight is a group. */
export class Fights implements Source {

    constructor(public readonly text: string, private readonly floor: FloorType){
    }

    public count(world: SourceWorld): number {
        return world.fightsOf(this.floor).length
    }

    public get(index: number, draw: SourceDraw): Fighter[] {
        return draw.fightsOf(this.floor)[index].map(monster => monsterFighter(monster, "monster", false))
    }
}

/** The monsters of the fights of a biome, each once: a single monster is a fight. */
export class BiomeMonsters implements Source {

    constructor(public readonly text: string, private readonly floor: FloorType){
    }

    public count(world: SourceWorld): number {
        return this.monsters(world).length
    }

    public get(index: number, draw: SourceDraw): Fighter[] {
        return [monsterFighter(this.monsters(draw)[index], "monster", false)]
    }

    private monsters(world: SourceWorld): Monster[] {
        const found = new Map<string, Monster>()
        for(const fight of world.fightsOf(this.floor)) for(const monster of fight) found.set(monster.name, monster)
        return [...found.values()]
    }
}

/** Every pair of a fight of one source and a fight of another: both teams' members together. */
export class Cross implements Source {

    constructor(public readonly text: string, private readonly first: Source, private readonly second: Source){
    }

    public count(world: SourceWorld): number {
        return this.first.count(world) * this.second.count(world)
    }

    public get(index: number, draw: SourceDraw): Fighter[] {
        const size = this.second.count(draw)
        return [...this.first.get(Math.floor(index / size), draw), ...this.second.get(index % size, draw)]
    }
}

/**
 * Sources read side by side: the fight n of each, together, instead of every pair. The shortest source starts
 * again from its first fight when it runs out, so a source of one fight goes with all of the others.
 */
export class Sum implements Source {

    constructor(public readonly text: string, private readonly parts: readonly Source[]){
    }

    public count(world: SourceWorld): number {
        const counts = this.parts.map(part => part.count(world))
        return counts.includes(0) ? 0 : Math.max(...counts)
    }

    public get(index: number, draw: SourceDraw): Fighter[] {
        return this.parts.flatMap(part => part.get(index % part.count(draw), draw))
    }
}

/** Several sources made one: the fights of the first, then those of the second, and so on. */
export class Union implements Source {

    constructor(public readonly text: string, private readonly parts: readonly Source[]){
    }

    public count(world: SourceWorld): number {
        return this.parts.reduce((sum, part) => sum + part.count(world), 0)
    }

    public get(index: number, draw: SourceDraw): Fighter[] {
        let left = index
        for(const part of this.parts){
            const size = part.count(draw)
            if(left < size) return part.get(left, draw)
            left -= size
        }
        throw new RangeError(`${this.text} : le combat ${index} n'existe pas.`)
    }
}

/** A source made to offer a single fight, drawn at random among those of another, avoiding who is already there. */
export class Random implements Source {

    constructor(public readonly text: string, private readonly inner: Source){
    }

    public count(): number {
        return 1
    }

    public get(_index: number, draw: SourceDraw): Fighter[] {
        const size = this.inner.count(draw)
        const order = Array.from({ length: size }, (_, index) => index)
        draw.rng.shuffle(order)
        if(order.length === 0) throw new RangeError(`${this.text} : aucun combat à tirer.`)
        // It returns at the first fight that is free, so the last one asked of the source is the one given: what
        // a `set:` below it kept is what comes out.
        for(const index of order){
            const members = this.inner.get(index, draw)
            if(!members.some(member => member.kind !== "monster" && draw.taken.has(takenKey(member)))) return members
        }
        return this.inner.get(order[0], draw)
    }
}
