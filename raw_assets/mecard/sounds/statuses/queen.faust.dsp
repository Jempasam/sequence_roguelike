declare name "queen";
declare description "three bright rising notes";
declare duration "0.5";

import("sfx.lib");

process(t) = sfx.osc.fm(sfx.osc.steps(660, 4, 3, t), 2, 1) * sfx.env.fadeio(0.02, 0.5, t) * 0.3 : sfx.fx.reverb(0.8, 0.3);
