declare name "enchanted";
declare description "a magic shimmer climbing";
declare duration "0.5";

import("sfx.lib");

process(t) = sfx.osc.fm(sfx.osc.steps(880, 3, 4, t), 2, 1) * sfx.env.fadeio(0.02, 0.9, t) * 0.25 : sfx.fx.reverb(0.8, 0.3);
