declare name "demonic";
declare description "a deep FM growl sinking";
declare duration "0.45";

import("sfx.lib");

process(t) = sfx.osc.fm(sfx.env.sweep(110, 70, t), 1.41, 4) * sfx.env.fadeio(0.05, 0.7, t) * 0.35;
