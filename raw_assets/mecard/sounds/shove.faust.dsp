declare name "shove";
declare description "a push: a quick whoosh of air ending on a dull thud";
declare duration "0.28";

import("sfx.lib");

whoosh(t) = (no.noise : sfx.filter.sweep_bp(1800, 500, 2, t)) * sfx.env.fadeio(0.3, 0.3, t) * 1.2 * (t < 0.6);
thud(u) = sfx.perc.thud(u) * 0.9;

process(t) = (whoosh(t) + thud(max((t - 0.55) / 0.45, 0)) * (t >= 0.55)) * 0.6;
