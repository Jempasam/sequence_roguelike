import { Vector2 } from "../base/Vector2"
import { Arena } from "../battle/Arena"
import { Battle } from "../battle/Battle"
import type { Unit } from "../battle/Unit"
import type { Monster } from "../catalog/monsters"
import { Heart } from "../heart/Heart"
import { RED_HEART } from "../heart/subs/RedHeartKind"
import { ARENA_SIZE, monsterStart, partyStarts, pillarsFor } from "../run/formation"
import { firstDeck, monsterHearts } from "../run/Hero"
import type { Hero } from "../run/Hero"
import type { Run } from "../run/Run"

import type { Fight, FightResult } from "./Fight"
import type { FightType } from "./FightType"

/**
 * The fight of the party against some monsters, in an arena with pillars: every character of the party on its
 * side, one unit for each, every monster on the other.
 */
export class StandardFight implements Fight {


    public readonly battle: Battle

    constructor(
        public readonly type: FightType,

        /** The run whose party fights. */
        private readonly run: Run,

        public readonly monsters: readonly Monster[],
    ){
        const { rng, heroesTeam, monstersTeam, heroes } = run
        const starts = partyStarts(heroes.length)
        const pillars = pillarsFor(starts, rng)
        const battle = new Battle(new Arena(ARENA_SIZE, ARENA_SIZE), rng.int(2 ** 31))
        battle.bot = run.bot
        heroes.forEach((hero, index) => {
            const unit = battle.add({
                name: hero.name, sprite: hero.sprite, team: heroesTeam, controller: hero.controller,
                position: starts[index], direction: Vector2.UP,
                hearts: hero.hearts, decks: hero.decks, unlimited: hero.unlimited, items: hero.items,
                usables: hero.usables, bases: hero.bases,
            })
            battle.refill(unit)
            this.#units.set(hero, unit)
        })
        monsters.forEach((monster, index) => {
            battle.add({
                name: `${monster.name} ${index + 1}`, sprite: monster.sprite, team: monstersTeam,
                controller: "bot",
                position: monsterStart(index), direction: Vector2.DOWN,
                hearts: monsterHearts(monster.hearts + run.travel.floor.level - 1), decks: [monster.cards],
                bases: {
                    draw: monster.draw, firstDraw: monster.draw, chainSize: monster.draw, ordered: true, size: monster.size ?? 1,
                },
            })
        })
        for(const { center, radius } of pillars) battle.addPillar(center, radius)
        // The battle knows no purse: what the heroes win in it goes to the one of the run.
        battle.onGetGold.add(({ unit, amount }) => {
            if(unit.team === heroesTeam) run.gold += amount
        })
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
        }
        return won ? "won" : "lost"
    }


    /** The unit of each character in the battle. */
    readonly #units = new Map<Hero, Unit>()
}

/** The hearts a unit leaves its battle with: those left, even empty. */
function keptHearts(unit: Unit): Heart[] {
    return Heart.copies(unit.hearts.all)
}
