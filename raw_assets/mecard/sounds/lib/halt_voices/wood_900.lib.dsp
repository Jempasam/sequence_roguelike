declare name "wood_900";
declare description "a voice shared by the halts: sfx.impact.wood(900,.9,u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.impact.wood(900,.9,t);

process(t) = sound(t);
