declare name "zap";
declare description "a voice shared by the halts: sfx.mech.zap(u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.mech.zap(t);

process(t) = sound(t);
