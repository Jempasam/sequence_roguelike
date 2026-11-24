declare name "latch";
declare description "a voice shared by the halts: sfx.mech.latch(u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.mech.latch(t);

process(t) = sound(t);
