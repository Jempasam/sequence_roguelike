declare name "cloth_06";
declare description "a voice shared by the halts: sfx.impact.cloth(.6,u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.impact.cloth(.6,t);

process(t) = sound(t);
