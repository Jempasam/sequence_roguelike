declare name "harpoon_pirate";
declare description "an arrr and a harpoon";
declare duration "0.8";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
weapon = library("lib/weapon.lib.dsp");

mix0(t) = (p(0,.5,human.old_cry(110)) + p(.4,.8,weapon.whoosh)*.5 + p(.7,1,sfx.nature.splash)*.3) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.224;
