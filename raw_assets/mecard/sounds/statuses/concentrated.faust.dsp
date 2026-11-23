declare name "concentrated";
declare description "two pure high notes settling";
declare duration "0.5";

import("sfx.lib");

process(t) = (sfx.osc.sine(880) + sfx.osc.sine(1320) * 0.5) * sfx.env.fadeio(0.15, 0.8, t) * 0.2 : sfx.fx.reverb(0.7, 0.2);
