declare name "soul_linked";
declare description "two close notes beating together";
declare duration "0.5";

import("sfx.lib");

process(t) = ((sfx.osc.sine(440) + sfx.osc.sine(448)) * sfx.env.fadeio(0.2, 0.6, t) * 0.25 : sfx.fx.reverb(0.8, 0.3)) * sfx.env.fadeio(0.01, 0.3, t);
