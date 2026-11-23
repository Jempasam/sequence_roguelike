declare name "disarm";
declare description "a clang and a low thump: a weapon knocked away";
declare duration "0.35";

import("sfx.lib");

process(t) = sfx.perc.clang(500, t) * 0.35 + sfx.osc.sine(sfx.env.sweep(400, 150, t)) * sfx.env.decay(10, t) * 0.25;
