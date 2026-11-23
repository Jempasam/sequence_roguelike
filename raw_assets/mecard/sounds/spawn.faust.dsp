declare name "spawn";
declare description "an arrival: a swirl of air rising, then a round pop";
declare duration "0.42";

import("sfx.lib");

swirl(t) = (no.noise : sfx.filter.sweep_bp(500, 3200, 4, t)) * sfx.env.fadeio(0.4, 0.35, t) * 0.8 * (t < 0.7);
pop(u) = sfx.osc.sine(sfx.env.sweep(500, 220, u)) * sfx.env.decay(14, u) * 0.6;

process(t) = (swirl(t) + pop(max((t - 0.65) / 0.35, 0)) * (t >= 0.65)) * 0.6;
