declare name "bleeding";
declare description "a heavy muffled drop";
declare duration "0.3";

import("sfx.lib");

process(t) = sfx.nature.drip(t) * 0.5 : fi.lowpass(2, 1500);
