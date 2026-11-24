declare name "purple";
declare description "a dark spell";
declare duration "0.8";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");
ghost = library("../lib/ghost.lib.dsp");
magic = library("../lib/magic.lib.dsp");
hollow = library("../filters/hollow.lib.dsp");

mix0(t) = (p(0,1,magic.shimmer) + p(0,1,ghost.wail(250))*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = hollow.filter(mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.389;
