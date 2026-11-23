declare name "puddle";
declare description "one low drop in a puddle";
declare duration "0.35";

import("sfx.lib");

process(t) = sfx.nature.drip(t) * 0.5 : fi.lowpass(2, 900);
