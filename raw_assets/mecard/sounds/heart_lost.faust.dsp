declare name "heart_lost";
declare description "a heart cracking: a high tick and glassy crackle falling away";
declare duration "0.34";

import("sfx.lib");

tick(t) = (no.noise : fi.highpass(2, 4000)) * sfx.env.decay(70, t) * 0.5;
shards(t) = (no.noises(2, 1) * (sfx.noise.crackle(0.06) != 0) : fi.resonbp(5200, 3, 1)) * sfx.env.decay(9, t) * 1.5;
low(t) = sfx.osc.sine(sfx.env.sweep(320, 140, t)) * sfx.env.decay(14, t) * 0.4;

process(t) = (tick(t) + shards(t) + low(t)) * 0.7;
