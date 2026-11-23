declare name "potion_coating";
declare description "two drops of potion";
declare duration "0.4";

import("sfx.lib");

process(t) = (sfx.nature.drip(min(t * 2, 1)) * (t < 0.5) + sfx.nature.drip(max(t * 2 - 1, 0)) * (t >= 0.5)) * 0.35;
