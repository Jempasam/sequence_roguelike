import { plainText } from "@game/core"
import type { Text } from "@game/core"
import { eventText } from "@game/core/mecard"
import type { Battle, BattleEvent, Card, Heart, HeartsSignal, Pose, Unit } from "@game/core/mecard"
import { mecardDisplay } from "@game/core/mecard/text-display"

/** A text of the game as one plain line. */
function textOf(text: Text): string {
    return plainText(text, mecardDisplay).replace(/\s*\n\s*/g, " ").trim()
}

function cardsOf(cards: readonly Card[]): string {
    return cards.length === 0 ? "(vide)" : cards.map(card => card.name).join(", ")
}

/** A life bar: each heart by its kind, an empty place in parentheses. */
function barOf(hearts: readonly Heart[]): string {
    return `[${hearts.map(heart => heart.isEmpty ? `(${String(heart.kind)})` : String(heart.kind)).join(" ")}]`
}

function poseOf(pose: Pose): string {
    return `${String(pose.position)} face ${String(pose.direction)}`
}

/** The events of the log the signals do not tell already: they are written as the battle wrote them. */
const TOLD_BY_EVENTS: ReadonlySet<BattleEvent["type"]> = new Set(["status", "skipped", "blocked", "dodged", "exploded", "error"])

/**
 * The full account of a battle, one line per thing that happens: what each unit plays, how it moves, what it
 * loses and gains. It listens to the signals of the battle, as a screen does, and writes them down.
 *
 * @remarks
 * The copies of the battle a strategy plays to look ahead are other battles: nothing of them is written.
 */
export class Journal {


    /** What was written, in order. */
    public readonly lines: string[] = []

    constructor(private readonly battle: Battle){
        const signals = battle.signals
        battle.roundStarted.add(round => this.#roundStarted(round))
        battle.passStarted.add(pass => {
            this.#pass = pass
            this.#write(`passe ${pass}`)
        })
        battle.roundEnded.add(round => this.#write(`fin du round ${round}`))
        signals.phase.add(phase => {
            if(phase === "execution") this.#executing()
        })
        signals.drawn.add(({ unit, card, deck }) => this.#write(`${this.label(unit)} pioche ${card.name} (deck ${deck + 1})`))
        signals.discarded.add(({ unit, card, deck }) => this.#write(`${this.label(unit)} défausse ${card.name} (deck ${deck + 1})`))
        signals.fleetingGiven.add(({ unit, card }) => this.#write(`${this.label(unit)} reçoit ${card.name} (éphémère)`))
        signals.fleetingSpent.add(({ unit, card }) => this.#write(`${this.label(unit)} perd ${card.name} (éphémère, joué ou jeté)`))
        signals.reshuffled.add(({ unit, deck }) => this.#write(`${this.label(unit)} rebat son deck ${deck + 1}`))
        signals.moved.add(({ unit, from, to }) => this.#write(`${this.label(unit)} bouge ${poseOf(from)} → ${poseOf(to)}`))
        signals.blinked.add(({ unit, from, to }) => this.#write(`${this.label(unit)} se téléporte ${poseOf(from)} → ${poseOf(to)}`))
        signals.stepStarted.add(({ unit, left }) => this.#write(`${this.label(unit)} joue un pas (${left} restant(s))`))
        signals.cardActivated.add(({ unit, first, last, cards }) => {
            this.#write(`${this.label(unit)} active ${cardsOf(cards)} (places ${first + 1}-${last + 1})`)
        })
        signals.cardInvalid.add(({ unit, index }) => {
            const card = unit.chain.cards[index]
            this.#write(`${this.label(unit)} : ${card ? card.name : "carte"} (place ${index + 1}) invalide, une entrée manque`)
        })
        signals.chainOverflowed.add(({ unit, cards }) => {
            this.#write(`${this.label(unit)} : chaîne de ${cards.length} cartes, trop longue, vidée`)
        })
        signals.chainChanged.add(({ unit, cards, cursor }) => {
            const marked = cards.map((card, index) => index === cursor ? `> ${card.name}` : card.name)
            this.#write(`${this.label(unit)} chaîne : ${marked.length === 0 ? "(vide)" : marked.join(", ")}${cursor >= cards.length ? " >" : ""}`)
        })
        signals.damaged.add(signal => this.#write(`${this.label(signal.unit)} subit ${signal.amount} ${signal.nature.name} ${this.#after(signal)}`))
        signals.healed.add(signal => this.#write(`${this.label(signal.unit)} soigne ${signal.amount} ${this.#after(signal)}`))
        signals.heartAdded.add(signal => this.#write(`${this.label(signal.unit)} gagne un cœur ${String(signal.heart.kind)} (place ${signal.index + 1}) ${this.#after(signal)}`))
        signals.heartRemoved.add(signal => this.#write(`${this.label(signal.unit)} perd ${signal.indexes.length} cœur(s) ${String(signal.kind)} ${this.#after(signal)}`))
        signals.heartReplaced.add(signal => {
            const into = signal.replacements.map(heart => String(heart.kind)).join(", ")
            this.#write(`${this.label(signal.unit)} : ${signal.indexes.length} cœur(s) ${String(signal.kind)} remplacé(s) par ${into} ${this.#after(signal)}`)
        })
        signals.heartWounded.add(signal => this.#write(`${this.label(signal.unit)} : la blessure prend ${signal.indexes.length} cœur(s) ${String(signal.kind)} ${this.#after(signal)}`))
        signals.died.add(({ unit }) => this.#write(`${this.label(unit)} meurt`))
        signals.spawned.add(({ unit }) => this.#write(`${this.label(unit)} apparaît : ${this.#state(unit)}`))
        signals.vanished.add(({ unit }) => this.#write(`${this.label(unit)} disparaît`))
        signals.statusAdded.add(({ unit, type, level }) => this.#write(`${this.label(unit)} reçoit le statut ${type.name} ${level}`))
        signals.statusLeveled.add(({ unit, type, level }) => this.#write(`${this.label(unit)} : statut ${type.name} → ${level}`))
        signals.statusRemoved.add(({ unit, type }) => this.#write(`${this.label(unit)} perd le statut ${type.name}`))
        signals.processStarted.add(({ unit, process }) => this.#write(`${this.label(unit)} : process ${String(process)} commence`))
        signals.processEnded.add(({ unit, process }) => this.#write(`${this.label(unit)} : process ${String(process)} finit`))
        signals.tethered.add(({ tether }) => this.#write(`${this.label(tether.from)} lié à ${this.label(tether.to)}`))
        signals.untethered.add(({ tether }) => this.#write(`${this.label(tether.from)} délié de ${this.label(tether.to)}`))
        signals.modifierAdded.add(({ unit, stat, key }) => this.#write(`${this.label(unit)} : ${stat} modifié par ${String(key)} (= ${String(unit.stats[stat].value)})`))
        signals.modifierRemoved.add(({ unit, stat, key }) => this.#write(`${this.label(unit)} : ${stat} perd ${String(key)} (= ${String(unit.stats[stat].value)})`))
        signals.notifyStatus.add(({ unit, target: status }) => this.#write(`${this.label(unit)} : le statut ${String(status)} agit`))
        signals.notifyHeart.add(({ unit, target: heart }) => this.#write(`${this.label(unit)} : un cœur ${String(heart.kind)} agit`))
        signals.notifyUnit.add(({ unit }) => this.#write(`${this.label(unit)} agit hors de sa chaîne (objet, règle)`))
    }


    /** The name of a unit in the journal: its own, numbered when another unit bears it. */
    public label(unit: Unit): string {
        const known = this.#labels.get(unit)
        if(known) return known
        const count = (this.#names.get(unit.name) ?? 0) + 1
        this.#names.set(unit.name, count)
        const label = count === 1 ? unit.name : `${unit.name}#${count}`
        this.#labels.set(unit, label)
        return label
    }

    /** Write the units as they stand, under a title. */
    public snapshot(title: string): void {
        this.#write(title)
        for(const unit of this.battle.units){
            if(unit.team === this.battle.scenery) continue
            this.lines.push(`    ${this.label(unit)} : ${this.#state(unit)}`)
        }
    }

    /** Write a line of its own: the start of the battle, its end. */
    public note(line: string): void {
        this.#flush()
        this.lines.push(line)
    }


    readonly #labels = new Map<Unit, string>()
    readonly #names = new Map<string, number>()

    /** How many events of the log of the battle are written already. */
    #told = 0
    #pass = 0

    #roundStarted(round: number): void {
        this.#pass = 0
        this.snapshot(`===== Round ${round} =====`)
    }

    /** The chains as they play, once built and rewritten, and the usables used. */
    #executing(): void {
        this.#write("exécution")
        for(const unit of this.battle.initiative){
            const used = this.battle.activatedBy(unit)
            const usables = used.length === 0 ? "" : ` | usables : ${used.map(each => String(each.usable)).join(", ")}`
            this.lines.push(`    ${this.label(unit)} chaîne jouée : ${cardsOf(unit.chain.cards)}${usables}`)
        }
    }

    #after(signal: HeartsSignal): string {
        return `→ ${barOf(signal.hearts)}`
    }

    #state(unit: Unit): string {
        const statuses = [...unit.statuses.values()].map(status => String(status))
        const processes = unit.processes.map(process => String(process))
        return [
            unit.team.name,
            unit.alive ? poseOf(unit) : "mort",
            `vie ${unit.life} ${barOf(unit.hearts.all)}`,
            statuses.length > 0 ? `statuts ${statuses.join(", ")}` : null,
            processes.length > 0 ? `process ${processes.join(", ")}` : null,
            unit.hand.length > 0 ? `main ${cardsOf(unit.hand)}` : null,
            unit.items.length > 0 ? `objets ${unit.items.map(item => String(item)).join(", ")}` : null,
            unit.usables.length > 0 ? `usables ${unit.usables.map(each => `${String(each.usable)}×${each.charges}`).join(", ")}` : null,
        ].filter(part => part !== null).join(" | ")
    }

    /** Write what the log of the battle holds and the signals do not tell, in the order it came. */
    #flush(): void {
        const events = this.battle.events
        for(; this.#told < events.length; this.#told++){
            const event = events[this.#told]
            if(event.type === "struck"){
                const by = event.unit ? this.label(event.unit) : "Le décor"
                this.lines.push(`${this.#time()} ${by} frappe une zone (${event.nature.name})`)
                continue
            }
            if(!TOLD_BY_EVENTS.has(event.type)) continue
            const text = eventText(event)
            if(text !== null) this.lines.push(`${this.#time()} ${textOf(text)}`)
        }
    }

    #time(): string {
        return `[R${this.battle.round}.${this.#pass}]`
    }

    #write(line: string): void {
        this.#flush()
        this.lines.push(`${this.#time()} ${line}`)
    }
}
