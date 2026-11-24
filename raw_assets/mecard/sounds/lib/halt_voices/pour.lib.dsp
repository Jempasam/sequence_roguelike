declare name "pour";
declare description "a voice shared by the halts: sfx.water.pour(u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.water.pour(t);

process(t) = sound(t);
