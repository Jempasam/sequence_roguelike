declare name "haunting_ghost";
declare description "a trembling moan with a long echo";
declare duration "1";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
ghost = library("lib/ghost.lib.dsp");
hollow = library("filters/hollow.lib.dsp");

mix0(t) = (p(0,1,ghost.wail(330))) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = hollow.filter(mix0, t);

process(t) = finish.filter(0.9, 0.4, mix1, t) * 0.282;
