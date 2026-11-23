declare name "explosive";
declare description "a crackling fuse and a rising whine";
declare duration "0.45";

import("sfx.lib");

process(t) = (no.noise * (sfx.noise.crackle(0.05) != 0) : fi.resonbp(4000, 2, 1)) * sfx.env.fadeio(0.05, 0.4, t) * 0.8 + sfx.osc.sine(sfx.env.sweep(300, 900, t)) * sfx.env.fadeio(0.1, 0.5, t) * 0.15;
