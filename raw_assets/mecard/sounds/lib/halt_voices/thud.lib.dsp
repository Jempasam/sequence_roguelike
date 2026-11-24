declare name "thud";
declare description "a voice shared by the halts: sfx.perc.thud(u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.perc.thud(t);

process(t) = sound(t);
