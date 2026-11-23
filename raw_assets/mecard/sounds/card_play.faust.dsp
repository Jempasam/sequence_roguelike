declare name "card_play";
declare description "a card slapped down: a dry high snap over a short low tock";
declare duration "0.18";

import("sfx.lib");

snap(t) = (no.noise : fi.highpass(2, 2500)) * sfx.env.decay(40, t) * 0.5;
tock(t) = sfx.osc.sine(sfx.env.sweep(220, 110, t)) * sfx.env.decay(22, t) * 0.5;

process(t) = (snap(t) + tock(t)) : sfx.fx.drive(1.3) : *(0.7);
