declare name "click_04";
declare description "a voice shared by the halts: sfx.mech.click(u)*.4";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.mech.click(t)*.4;

process(t) = sound(t);
