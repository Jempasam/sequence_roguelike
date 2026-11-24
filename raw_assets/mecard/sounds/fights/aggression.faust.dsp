declare name "aggression";
declare description "a sharp rising whoosh ending on a high clang: an attack";
declare duration "0.6";

import("sfx.lib");

timing = library("../lib/timing.lib.dsp");

process(t) = ((no.noise : sfx.filter.sweep_bp(500, 4000, 3, t)) * sfx.env.attack(.4, t) * (t < .4) * 5 + sfx.perc.clang(800, timing.u2(.4, t)) * timing.g2(.4, t) * .6) : sfx.fx.dcblock : *(0.161);
