declare name "fallback_positive";
declare description "a bright rising bloop: a good status";
declare duration "0.3";

import("sfx.lib");

process(t) = sfx.osc.sine(sfx.env.sweep(500, 1000, t)) * sfx.env.fadeio(0.05, 0.7, t) * 0.4 : sfx.fx.reverb(0.6, 0.2);
