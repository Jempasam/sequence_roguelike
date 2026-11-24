declare name "tamer";
declare description "a whip crack and a whistle";
declare duration "0.5";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
weapon = library("lib/weapon.lib.dsp");

mix0(t) = (p(0,.3,weapon.shot)*.5 + p(.3,1,sfx.inst.flute(1200))*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 2.018;
