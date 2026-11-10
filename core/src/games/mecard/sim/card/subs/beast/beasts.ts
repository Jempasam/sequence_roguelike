import { visual } from "../../../base/Visual"
import { BLUE_HEART } from "../../../heart/subs/BlueHeartKind"
import { PINK_HEART } from "../../../heart/subs/PinkHeartKind"
import { RED_HEART } from "../../../heart/subs/RedHeartKind"
import type { Beast } from "../../CardType"

import { SLASH } from "../attack/Slash"
import { SWEEP } from "../attack/Sweep"
import { THRUST } from "../attack/Thrust"
import { CHARGE } from "../composite/MergedCard"
import { AIM } from "../movement/Aim"
import { BLINK } from "../movement/Blink"
import { BOUNCE_DASH } from "../movement/BounceDash"
import { STEP } from "../movement/Step"
import { WAIT } from "../movement/Wait"
import { BLEED, WEAKENING_BLOWS } from "../status/StatusCards"
import { TACKLE } from "../attack/Tackle"
import { BATTERING_RAM } from "../combat/Shoves"
import { DOUBLE_DIAGONAL } from "../modifier/DoubleDiagonal"
import { LASSO } from "../movement/HookCard"
import { STUNNING_DASH } from "../movement/StunningDash"
import { SPIRIT_ANCHOR, SPIRIT_PROJECTION } from "../summon/SpiritCards"
import { BeastCard } from "./BeastCard"

/** The wolf: it hunts, rushing in then biting, and makes its prey bleed. */
export const WOLF_SPIRIT: Beast = {
    name: "Loup",
    sprite: visual("units/wolf"),
    run: [BOUNCE_DASH],
    bite: [BLEED, SLASH],
    hearts: [{ kind: BLUE_HEART, count: 4 }],
    body: [AIM, "run", "bite", "bite"],
}

/** The hawk: it strikes, flies back, and strikes again. */
export const HAWK_SPIRIT: Beast = {
    name: "Faucon",
    sprite: visual("units/hawk"),
    run: [BLINK],
    bite: [AIM, CHARGE],
    hearts: [{ kind: BLUE_HEART, count: 2 }],
    body: [AIM, "run", AIM, "run", AIM, "bite"],
}

/** The bear: it stands its ground and mauls whatever comes, never running. */
export const BEAR_SPIRIT: Beast = {
    name: "Ours",
    sprite: visual("units/bear"),
    run: [STEP, WAIT],
    bite: [AIM, WAIT, SLASH, SWEEP],
    hearts: [{ kind: RED_HEART, count: 4 }, { kind: PINK_HEART, count: 1 }],
    body: [AIM, WAIT, "bite", WAIT, "run"],
}

/** The fox: it stays behind and sends its spirit, which runs, bites, and comes back to an anchor. */
export const FOX_SPIRIT: Beast = {
    name: "Renard",
    sprite: visual("units/fox"),
    run: [SPIRIT_ANCHOR, STEP],
    bite: [AIM, THRUST],
    hearts: [{ kind: BLUE_HEART, count: 2 }],
    body: [AIM, SPIRIT_PROJECTION, "run", "bite"],
}

/** The boar: it rushes in, stunning what it hits, then gores in a double diagonal thrust. */
export const BOAR_SPIRIT: Beast = {
    name: "Sanglier",
    sprite: visual("units/boar"),
    run: [STUNNING_DASH],
    bite: [DOUBLE_DIAGONAL, THRUST],
    hearts: [{ kind: BLUE_HEART, count: 3 }],
    body: ["run", AIM, "bite"],
}

/** The ram: it waits, aims, then batters its prey away and weakens it. */
export const RAM_SPIRIT: Beast = {
    name: "Bélier sauvage",
    sprite: visual("units/ram"),
    run: [BATTERING_RAM],
    bite: [WEAKENING_BLOWS],
    hearts: [{ kind: BLUE_HEART, count: 3 }],
    body: [WAIT, AIM, "run", "bite"],
}

/** The frog: it leaps away, lassoes its prey with its tongue, and tackles it. */
export const FROG_SPIRIT: Beast = {
    name: "Grenouille",
    sprite: visual("units/frog"),
    run: [BLINK],
    bite: [LASSO, TACKLE],
    hearts: [{ kind: BLUE_HEART, count: 2 }],
    body: [AIM, LASSO, "bite"],
}

export const WOLF_CARD = new BeastCard(WOLF_SPIRIT)

export const HAWK_CARD = new BeastCard(HAWK_SPIRIT)

export const BEAR_CARD = new BeastCard(BEAR_SPIRIT)

export const FOX_CARD = new BeastCard(FOX_SPIRIT)

export const BOAR_CARD = new BeastCard(BOAR_SPIRIT)

export const RAM_CARD = new BeastCard(RAM_SPIRIT)

export const FROG_CARD = new BeastCard(FROG_SPIRIT)

/** Every beast card. */
export const BEAST_CARDS: readonly BeastCard[] = [
    WOLF_CARD, HAWK_CARD, BEAR_CARD, FOX_CARD, BOAR_CARD, RAM_CARD, FROG_CARD,
]
