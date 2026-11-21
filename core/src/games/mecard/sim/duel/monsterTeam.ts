import { Vector2 } from "../base/Vector2"
import { Arena } from "../battle/Arena"
import { Battle } from "../battle/Battle"
import { Team } from "../battle/Team"
import type { Monster } from "../catalog/monsters"
import { ARENA_SIZE, partyStarts } from "../run/formation"
import { monsterHearts } from "../run/Hero"
import type { SavedUnit } from "../save/battleSave"

/**
 * What a monster costs a master to put in an encounter: its hearts, and one more for every two cards it
 * draws.
 * A measure of what it is worth in a fight, never a limit of the rules.
 */
export function threatOf(monster: Monster): number {
    return monster.hearts + Math.ceil(monster.draw / 2)
}

/**
 * The monsters as units a battle can be saved from, planned by whoever is given them rather than by a bot:
 * what a master brings to a duel, as the party of a run brings its heroes.
 *
 * @param level - How much its hearts grow: 1 for the monsters as they are.
 */
export function unitsOfMonsters(monsters: readonly Monster[], level = 1): readonly SavedUnit[] {
    const battle = new Battle(new Arena(ARENA_SIZE, ARENA_SIZE), 0)
    const starts = partyStarts(monsters.length)
    const team = new Team("Monstres")
    monsters.forEach((monster, index) => {
        const unit = battle.add({
            name: `${monster.name} ${index + 1}`, sprite: monster.sprite, team,
            controller: "player", position: starts[index], direction: Vector2.DOWN,
            hearts: monsterHearts(monster.hearts + level - 1), decks: [monster.cards],
            items: [...monster.items ?? []],
            bases: {
                draw: monster.draw, firstDraw: monster.draw, chainSize: monster.draw, ordered: true,
                size: monster.size ?? 1, showChain: false, showHand: true,
            },
        })
        battle.refill(unit)
    })
    return battle.save().units
}
