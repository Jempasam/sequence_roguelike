declare name "boom";
declare description "a voice shared by the halts: sfx.perc.boom(u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.perc.boom(t);

process(t) = sound(t);
