declare name "servo";
declare description "a voice shared by the halts: sfx.mech.servo(u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.mech.servo(t);

process(t) = sound(t);
