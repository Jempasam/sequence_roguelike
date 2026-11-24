declare name "confirm";
declare description "a voice shared by the halts: sfx.retro.confirm(u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.retro.confirm(t);

process(t) = sound(t);
