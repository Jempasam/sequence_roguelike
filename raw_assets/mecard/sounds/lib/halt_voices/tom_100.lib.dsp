declare name "tom_100";
declare description "a voice shared by the halts: sfx.perc.tom(100,u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.perc.tom(100,t);

process(t) = sound(t);
