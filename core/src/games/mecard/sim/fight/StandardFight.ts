import { Vector2 } from "../base/Vector2"
import { Arena } from "../battle/Arena"
import { Battle } from "../battle/Battle"
import type { Unit } from "../battle/Unit"
import type { Monster } from "../catalog/monsters"
import { Heart } from "../heart/Heart"
import { RED_HEART } from "../heart/subs/RedHeartKind"
import type { Spot } from "../run/Journey"
import { ARENA_SIZE, monsterStart, partyStarts } from "../run/formation"
import { firstDeck, foeOf, heroOf, heroSpec, scaledKit } from "../run/Hero"
import type { Hero } from "../run/Hero"
import type { Run } from "../run/Run"

import type { Fight, FightResult, MonsterPose } from "./Fight"
import type { FightType } from "./FightType"

/**
 * The fight of the party against some monsters, in an arena with the hazards its type lays out, every
 * character of the party on its side, one unit for each.
 *
 * @remarks
 * It only makes its battle and takes the party back from it: the battle is the engine of the rules, and the
 * {@link Travel} fights it. It is its type that says which monsters stand in the arena, and how.
 */
export class StandardFight implements Fight {


    public readonly monsters: readonly Monster[]

    public readonly battle: Battle

    constructor(
        /** The fight it is. */
        public readonly type: FightType,

        /** The run whose party fights. */
        private readonly run: Run,

        /** Where the place it is fought on lies. */
        place: Spot,
    ){
        const { rng, heroesTeam, monstersTeam, heroes } = run
        const starts = partyStarts(heroes.length)
        const battle = new Battle(new Arena(ARENA_SIZE, ARENA_SIZE), rng.int(2 ** 31))
        battle.bot = run.bot
        heroes.forEach((hero, index) => {
            const unit = battle.add(heroSpec(hero, heroesTeam, starts[index], Vector2.UP))
            battle.refill(unit)
            this.#units.set(hero, unit)
        })
        const level = run.travel.floor.level
        const monsters: Monster[] = []
        let placed = 0
        const addHero = (fighter: Hero, pose: MonsterPose = {}): void => {
            const index = placed++
            const unit = battle.add({
                name: fighter.name, sprite: fighter.sprite, team: monstersTeam,
                controller: pose.controller ?? "bot",
                position: pose.position ?? monsterStart(index), direction: pose.direction ?? Vector2.DOWN,
                hearts: fighter.hearts, decks: fighter.decks, unlimited: fighter.unlimited, items: fighter.items,
                usables: fighter.usables, bases: { showChain: true, showHand: true, ...fighter.bases },
            })
            battle.refill(unit)
        }
        type.populate({
            rng, level, layer: place.layer,
            addHero,
            addKit: (kit, pose) => addHero(scaledKit(heroOf(kit), level), pose),
            add: (monster, pose = {}) => {
                const index = placed++
                monsters.push(monster)
                const foe = foeOf(monster, `${monster.name} ${monsters.length}`, level)
                const position = pose.position ?? monsterStart(index)
                const unit = battle.add({
                    ...heroSpec(foe, monstersTeam, position, pose.direction ?? Vector2.DOWN),
                    controller: pose.controller ?? "bot",
                })
                this.#foes.set(unit, monster)
            },
        })
        this.monsters = monsters
        for(const { type: hazard, at, direction } of type.hazards ?? []) hazard.lay(battle, at, direction)
        // The battle knows no purse: what the heroes win in it goes to the one of the run.
        battle.onGetGold.add(({ unit, amount }) => {
            if(unit.team === heroesTeam) run.gold += amount
        })
        battle.goldOf = unit => unit.team === heroesTeam ? run.gold : 0
        battle.onGetCards.add(({ unit, cards }) => {
            const hero = heroes.find(each => this.#units.get(each) === unit)
            if(hero) run.changeDeck(firstDeck(hero), deck => deck.push(...cards))
        })
        this.battle = battle
    }


    public finish(): FightResult {
        const { battle, run } = this
        if(battle.phase !== "over") throw new Error("Only a battle fought and over ends.")
        const won = battle.winner === run.heroesTeam
        for(const hero of run.heroes){
            const unit = this.#units.get(hero)
            if(unit){
                hero.hearts = keptHearts(unit)
                hero.usables.splice(0, hero.usables.length, ...unit.usables)
            }
            const fell = !hero.hearts.some(heart => !heart.isEmpty)
            if(won && fell) hero.hearts[0] = new Heart(RED_HEART)
            if(won) for(const item of hero.items) item.afterFight?.({ hearts: hero.hearts, fell })
        }
        if(won) for(const unit of battle.captured){
            const monster = this.#foes.get(unit)
            if(monster) run.tame(monster)
        }
        return won ? "won" : "lost"
    }


    /** The unit of each character in the battle. */
    readonly #units = new Map<Hero, Unit>()

    /** The kind of monster each enemy unit was made from, for the ones tamed in the battle. */
    readonly #foes = new Map<Unit, Monster>()
}

/** The hearts a unit leaves its battle with: those left, even empty. */
function keptHearts(unit: Unit): Heart[] {
    return Heart.copies(unit.hearts.all)
}
