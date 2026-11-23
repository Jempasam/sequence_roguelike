declare name "fleeting";
declare description "an airy high note fading away";
declare duration "0.5";

import("sfx.lib");

process(t) = sfx.osc.sine(sfx.env.sweep(1200, 1800, t)) * sfx.env.fadeio(0.1, 0.9, t) * 0.2 : sfx.fx.reverb(0.8, 0.3);
