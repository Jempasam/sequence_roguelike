declare name "momentum";
declare description "a quickening staircase of notes";
declare duration "0.35";

import("sfx.lib");

process(t) = sfx.osc.sine(sfx.osc.steps(300, 4, 5, t)) * sfx.env.fadeio(0.02, 0.4, t) * 0.3;
