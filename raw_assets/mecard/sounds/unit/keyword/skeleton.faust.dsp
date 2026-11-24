declare name "skeleton";
declare description "any skeleton: bones and a hollow voice";
declare duration "0.8";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");
undead = library("../lib/undead.lib.dsp");
hollow = library("../filters/hollow.lib.dsp");

mix0(t) = (p(0,.6,undead.rattle) + p(.3,1,undead.hollow(120))*.6) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = hollow.filter(mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.363;
