declare name "mine";
declare description "a click, then a warning beep";
declare duration "0.5";

import("sfx.lib");

process(t) = sfx.mech.click(min(t / 0.2, 1)) * (t < 0.2) * 0.6 + sfx.mech.beep(1200, max((t - 0.3) / 0.7, 0)) * (t >= 0.3) * 0.4;
