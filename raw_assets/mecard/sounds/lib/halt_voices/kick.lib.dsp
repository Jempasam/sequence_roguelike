declare name "kick";
declare description "a voice shared by the halts: sfx.perc.kick(u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.perc.kick(t);

process(t) = sound(t);
