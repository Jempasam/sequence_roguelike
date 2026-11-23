declare name "soaked";
declare description "a water splash";
declare duration "0.4";

import("sfx.lib");

process(t) = sfx.nature.splash(t) * 0.6;
