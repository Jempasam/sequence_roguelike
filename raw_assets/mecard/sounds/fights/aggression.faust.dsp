declare name "aggression";
declare description "a sharp rising whoosh ending on a high clang: an attack";
declare duration "0.6";

import("sfx.lib");

u1(a, t) = min(t / a, 1);
u2(a, t) = max((t - a) / (1 - a), 0);
g1(a, t) = (t < a);
g2(a, t) = (t >= a);

process(t) = ((no.noise : sfx.filter.sweep_bp(500, 4000, 3, t)) * sfx.env.attack(.4, t) * (t < .4) * 5 + sfx.perc.clang(800, u2(.4, t)) * g2(.4, t) * .6) : sfx.fx.dcblock : *(0.161);
