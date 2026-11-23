declare name "vulnerable";
declare description "a glassy clang over a falling thump";
declare duration "0.35";

import("sfx.lib");

process(t) = sfx.perc.clang(900, t) * 0.3 + sfx.osc.sine(sfx.env.sweep(300, 100, t)) * sfx.env.decay(10, t) * 0.25;
