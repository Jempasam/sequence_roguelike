declare name "wet";
declare description "a sound through water: dulled and slowly flanged";

import("sfx.lib");

filter(s, t) = s(t) : sfx.filter.lpf(2200, 0.7) : sfx.fx.flange(0.7, 0.6);
