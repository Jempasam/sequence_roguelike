declare name "creak";
declare description "a voice shared by the halts: sfx.mech.creak(u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.mech.creak(t);

process(t) = sound(t);
