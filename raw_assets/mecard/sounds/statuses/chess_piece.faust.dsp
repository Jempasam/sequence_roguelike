declare name "chess_piece";
declare description "a wooden tick with a soft ring";
declare duration "0.3";

import("sfx.lib");

process(t) = (no.noise : fi.resonbp(1800, 3, 1)) * sfx.env.decay(60, t) * 0.4 + sfx.osc.sine(660) * sfx.env.decay(8, t) * 0.15;
