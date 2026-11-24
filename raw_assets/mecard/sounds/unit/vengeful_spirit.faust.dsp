declare name "vengeful_spirit";
declare description "a tearing cry";
declare duration "0.8";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
ghost = library("lib/ghost.lib.dsp");
hollow = library("filters/hollow.lib.dsp");

mix0(t) = (p(0,1,ghost.scream(500))) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = hollow.filter(mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.437;
