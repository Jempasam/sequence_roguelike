declare name "sliding_parry";
declare description "a metal slide: a blade gliding along a blade";
declare duration "0.35";

import("sfx.lib");

process(t) = (no.noise : sfx.filter.sweep_bp(1200, 3500, 3, t)) * sfx.env.fadeio(0.3, 0.5, t) * 0.7 + sfx.perc.clang(1100, t) * 0.2;
