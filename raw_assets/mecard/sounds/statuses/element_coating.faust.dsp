declare name "element_coating";
declare description "a shimmering FM veil";
declare duration "0.5";

import("sfx.lib");

process(t) = sfx.osc.fm(sfx.env.sweep(600, 900, t), 2.7, 2) * sfx.env.fadeio(0.2, 0.7, t) * 0.2 : sfx.fx.reverb(0.8, 0.3);
