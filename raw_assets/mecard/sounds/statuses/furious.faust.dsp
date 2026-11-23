declare name "furious";
declare description "a rough pulse rising: held-in anger";
declare duration "0.4";

import("sfx.lib");

process(t) = sfx.osc.pulse(sfx.env.sweep(200, 400, t), 0.3) * sfx.env.fadeio(0.05, 0.5, t) * 0.25;
