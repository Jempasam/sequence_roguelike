declare name "tom_60";
declare description "a voice shared by the halts: sfx.perc.tom(60,u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.perc.tom(60,t);

process(t) = sound(t);
