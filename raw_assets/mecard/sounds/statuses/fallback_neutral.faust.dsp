declare name "fallback_neutral";
declare description "a magic bloop: a soft FM note gliding up";
declare duration "0.32";

import("sfx.lib");

process(t) = sfx.osc.fm(sfx.env.sweep(420, 900, t), 2, 1.2) * sfx.env.fadeio(0.04, 0.8, t) * 0.4 : sfx.fx.reverb(0.6, 0.2);
