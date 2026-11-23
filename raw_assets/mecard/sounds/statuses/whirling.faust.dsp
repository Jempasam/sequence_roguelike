declare name "whirling";
declare description "a swirl of wind";
declare duration "0.5";

import("sfx.lib");

process(t) = (no.noise : sfx.filter.sweep_bp(400, 1500, 4, t)) * (1 + 0.5 * os.osc(10)) * sfx.env.fadeio(0.4, 0.4, t) * 0.5;
