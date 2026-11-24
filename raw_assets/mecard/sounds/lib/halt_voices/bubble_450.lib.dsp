declare name "bubble_450";
declare description "a voice shared by the halts: sfx.water.bubble(450,u)*1.5";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.water.bubble(450,t)*1.5;

process(t) = sound(t);
