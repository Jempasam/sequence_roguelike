declare name "possessed";
declare description "a wobbling low FM voice";
declare duration "0.5";

import("sfx.lib");

process(t) = sfx.osc.fm(sfx.env.sweep(140, 100, t), 1.5, 3) * sfx.env.fadeio(0.1, 0.6, t) * 0.3 : sfx.fx.tremolo(9, 0.5);
