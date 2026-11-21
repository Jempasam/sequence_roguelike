import type { SaveSlot } from "../../../engine/save"
import { Observable } from "../sim/base/Observable"
import type { Observer } from "../sim/base/Observable"
import type { Battle } from "../sim/battle/Battle"
import { STARTING_KITS } from "../sim/catalog/kits"
import type { Kit } from "../sim/catalog/kits"
import type { Monster } from "../sim/catalog/monsters"
import { allCards } from "../sim/run/Hero"
import type { HeartLoot, Run } from "../sim/run/Run"
import { KEPT_LOOT_HEARTS, SPENT_LOOT_HEARTS } from "../sim/run/Run"
import { CATALOG_CATEGORIES } from "../sim/save/catalogSave"
import type { CatalogCategory, CatalogSave } from "../sim/save/catalogSave"

/** The key of an entry of the loot hearts: the kind and how many, which tell the entries of a kind apart. */
export function lootHeartKey({ heart, count }: HeartLoot): string {
    return `${heart.name} ×${count}`
}

/**
 * What the player found, over every game: the cards, the monsters, the items... met, won or chosen. It is
 * filled by the runs it listens to, and writes itself to its slot whenever something new is found.
 *
 * @remarks
 * Entries are told by the name the catalogues give them. A name no catalogue knows any more stays in the
 * save, harmless. A failure to write is reported, and the next discovery writes everything again.
 */
export class PlayerCatalog {


    /** Something new was found. */
    public readonly changed = new Observable<void>(error => { throw error })

    constructor(
        /** Where the catalogue is kept, none to keep it nowhere. */
        public slot: SaveSlot<CatalogSave>|null,

        /** Tell the players that the catalogue could not be written. */
        private readonly report: (text: string) => void = () => {},
    ){
        for(const category of CATALOG_CATEGORIES) this.#found[category] = new Set()
    }


    /** Read the catalogue from its slot. Nothing is kept in it when the slot holds none or fails to be read. */
    public async load(): Promise<void> {
        if(!this.slot) return
        let saved: CatalogSave|null
        try {
            saved = await this.slot.load()
        } catch(error){
            this.report(`Le catalogue du joueur n'a pas pu être lu : ${String(error)}`)
            return
        }
        if(saved) for(const category of CATALOG_CATEGORIES) for(const name of saved[category]) this.#found[category].add(name)
        this.changed.notify()
        // What was found before the slot opened is written with what it held.
        this.#saveSoon()
    }

    /** Did the player find the entry of a name? */
    public has(category: CatalogCategory, name: string): boolean {
        return this.#found[category].has(name)
    }

    /** How many entries of a category the player found. */
    public count(category: CatalogCategory): number {
        return this.#found[category].size
    }

    /** Forget everything found, and write the empty catalogue. @returns How many entries were forgotten. */
    public clear(): number {
        let forgotten = 0
        for(const category of CATALOG_CATEGORIES){
            forgotten += this.#found[category].size
            this.#found[category].clear()
        }
        this.changed.notify()
        this.#saveSoon()
        return forgotten
    }

    /** Write down that the player found an entry, and tell it when it is new. */
    public discover(category: CatalogCategory, name: string): void {
        const found = this.#found[category]
        if(found.has(name)) return
        found.add(name)
        this.changed.notify()
        this.#saveSoon()
    }

    /**
     * Listen to a run, to find what its party chooses, wins and fights, instead of the run listened to before.
     * What the run holds already is found at once.
     */
    public attach(run: Run): void {
        this.detach()
        const found = (category: CatalogCategory, name: string) => this.discover(category, name)
        // A unit won gives its cards to the catalogue: a hero hired as a kit, a monster tamed or recruited.
        const kitFound = (kit: Kit) => {
            found("kits", kit.name)
            for(const card of kit.cards) found("cards", card.name)
        }
        const petFound = (monster: Monster) => {
            found("pets", monster.name)
            for(const card of monster.cards) found("cards", card.name)
        }
        for(const kit of STARTING_KITS) kitFound(kit)
        const observers = this.#observers
        observers.push(
            run.cardsGained.add(cards => cards.forEach(card => found("cards", card.name))),
            run.boosterOpened.add(booster => found("boosters", booster.name)),
            run.upgradeApplied.add(upgrade => found("upgrades", upgrade.name)),
            run.kitHired.add(kitFound),
            run.petTamed.add(petFound),
            run.itemGained.add(({ gained }) => found("items", gained.name)),
            run.usableGained.add(({ gained }) => found("usables", gained.name)),
            run.heartGained.add(({ gained }) => found("hearts", gained.name)),
            run.heartLootGiven.add(loot => {
                if(KEPT_LOOT_HEARTS.some(each => each.heart === loot.heart && each.count === loot.count)){
                    found("keptHearts", lootHeartKey(loot))
                }
                if(SPENT_LOOT_HEARTS.some(each => each.heart === loot.heart && each.count === loot.count)){
                    found("tempHearts", lootHeartKey(loot))
                }
            }),
            run.battleStarted.add(battle => this.#battle(run, battle)),
            run.travel.floorEntered.add(floor => found("floors", floor.type.name)),
            run.travel.visitStarted.add(halt => found("halts", halt.type.id)),
            // What the party holds is read again after each halt.
            run.travel.visitEnded.add(() => this.discoverParty(run)),
        )
        this.discoverParty(run)
        // The floor the party stands on when the run is made or loaded is not entered.
        found("floors", run.travel.floor.type.name)
        // What the loaded party holds was found by an earlier game, or this one.
        observers.push(run.loaded.add(loaded => {
            found("floors", loaded.travel.floor.type.name)
            this.discoverParty(loaded)
        }))
    }

    /**
     * Find all that the party holds now: the cards of its decks, the kinds of its hearts, its items and its
     * usables. A kit or a pet is found when it joins, and loot hearts when taken, so they are not read here.
     */
    public discoverParty(run: Run): void {
        for(const hero of run.heroes){
            for(const card of [...allCards(hero), ...hero.unlimited]) this.discover("cards", card.name)
            for(const heart of hero.hearts) this.discover("hearts", heart.kind.name)
            for(const item of hero.items) this.discover("items", item.name)
            for(const carried of hero.usables) this.discover("usables", carried.usable.name)
        }
    }

    /** Stop listening to the run listened to. */
    public detach(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers.length = 0
    }


    readonly #found = {} as Record<CatalogCategory, Set<string>>
    readonly #observers: Observer[] = []
    #saving = false

    /** What a battle shows: the monsters, the sort of fight and its hazards, then the statuses that appear in it. */
    #battle(run: Run, battle: Battle): void {
        const fight = run.travel.fight
        if(fight){
            this.discover("fights", fight.type.id)
            for(const monster of fight.monsters) this.discover("monsters", monster.name)
            for(const { type } of fight.type.hazards ?? []) this.discover("hazards", type.id)
        }
        // The observer dies with the battle, so none is kept.
        battle.signals.statusAdded.add(({ type }) => this.discover("effects", type.name))
    }

    /** Write the catalogue once, whatever the number of entries found before the write starts. */
    #saveSoon(): void {
        if(!this.slot || this.#saving) return
        this.#saving = true
        void Promise.resolve().then(async () => {
            this.#saving = false
            const save = {} as Record<CatalogCategory, string[]>
            for(const category of CATALOG_CATEGORIES) save[category] = [...this.#found[category]]
            try {
                await this.slot!.save(save)
            } catch(error){
                this.report(`Le catalogue du joueur n'a pas pu être écrit : ${String(error)}`)
            }
        })
    }
}
