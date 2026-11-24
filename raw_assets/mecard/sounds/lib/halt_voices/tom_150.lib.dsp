declare name "tom_150";
declare description "a voice shared by the halts: sfx.perc.tom(150,u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.perc.tom(150,t);

process(t) = sound(t);
