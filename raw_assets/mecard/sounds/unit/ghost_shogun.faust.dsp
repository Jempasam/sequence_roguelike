declare name "ghost_shogun";
declare description "a deep plaint and a temple bell";
declare duration "1.1";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
ghost = library("lib/ghost.lib.dsp");
hollow = library("filters/hollow.lib.dsp");
bell_79 = library("../lib/halt_voices/bell_79.lib.dsp");

mix0(t) = (p(0,1,ghost.wail(220)) + p(.1,1,bell_79.sound)*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = hollow.filter(mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.851;
