declare name "coin";
declare description "a voice shared by the halts: sfx.retro.coin(u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.retro.coin(t);

process(t) = sound(t);
