declare name "healing";
declare description "a warm triangle chime climbing";
declare duration "0.6";

import("sfx.lib");

process(t) = sfx.osc.tri(sfx.osc.steps(523, 5, 2, t)) * sfx.env.fadeio(0.03, 0.9, t) * 0.3 : sfx.fx.reverb(0.7, 0.25);
