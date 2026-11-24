declare name "cloth_05";
declare description "a voice shared by the halts: sfx.impact.cloth(0.5,u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.impact.cloth(0.5,t);

process(t) = sound(t);
