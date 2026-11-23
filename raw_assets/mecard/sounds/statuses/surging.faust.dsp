declare name "surging";
declare description "a wave swelling and receding";
declare duration "0.6";

import("sfx.lib");

process(t) = (no.noise : sfx.filter.sweep_lp(300, 2000, 1, t)) * sfx.env.fadeio(0.7, 0.3, t) * 0.5;
