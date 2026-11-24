declare name "kraken_captain";
declare description "a deep gurgle and a fog horn";
declare duration "1.2";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
slime = library("lib/slime.lib.dsp");
size = library("filters/size.lib.dsp");

mix0(t) = (p(0,1,slime.burble)*.8 + p(0,.8,human.old_cry(70)) + p(.3,1,sfx.water.slosh)*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(1.8, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.589;
