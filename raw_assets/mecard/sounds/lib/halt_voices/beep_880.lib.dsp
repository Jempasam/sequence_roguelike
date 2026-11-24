declare name "beep_880";
declare description "a voice shared by the halts: sfx.mech.beep(880,u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.mech.beep(880,t);

process(t) = sound(t);
