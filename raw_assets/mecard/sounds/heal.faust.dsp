declare name "heal";
declare description "a soft rising chime: three sine notes climbing";
declare duration "0.6";

import("sfx.lib");

process(t) = (sfx.osc.sine(sfx.osc.steps(440, 4, 3, t)) * sfx.env.fadeio(0.03, 0.4, t) * 0.35 : sfx.fx.reverb(0.7, 0.25))
    * sfx.env.fadeio(0.01, 0.2, t);
