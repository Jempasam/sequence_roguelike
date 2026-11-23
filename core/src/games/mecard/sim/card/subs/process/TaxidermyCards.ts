import { Stuffing, Taming } from "../../../process/subs/Taxidermy"

import { Rarity } from "../../Rarity"
import { ActionCard } from "../ActionCard"
import { onSelf } from "../tools/targeting"
import { BATTLE_ROUND, HEART, UNIT } from "../../../base/keywords"

export const STUFFING = new ActionCard("Empaillage", [
    "Jusqu'à la fin du ", BATTLE_ROUND, ", la prochaine ", UNIT, " ennemie que tu tues est empaillée : elle combat pour toi, ",
    "pour ce combat, avec la moitié de ses ", HEART.as("cœurs"), ".",
], Rarity.RARE, onSelf((battle, unit) => battle.startProcess(unit, new Stuffing()), "empaillage"))

export const TAMING_MARK = new ActionCard("Marque du dresseur", [
    "Jusqu'à la fin du ", BATTLE_ROUND, ", la prochaine unité ennemie que tu tues rejoint ton équipe pour de bon, si le combat est gagné.",
], Rarity.LEGENDARY, onSelf((battle, unit) => battle.startProcess(unit, new Taming()), "dressage"))
