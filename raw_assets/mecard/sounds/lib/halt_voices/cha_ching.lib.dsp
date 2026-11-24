declare name "cha_ching";
declare description "a voice shared by the halts: the cash register, a dry click then a bright bell";
declare duration "0.5";

import("sfx.lib");

sound(t) = sfx.sequence.seqw2(0.15, sfx.impact.metal(1800, 1), 0.85, sfx.impact.metal(3200, 1), t);

process(t) = sound(t);
