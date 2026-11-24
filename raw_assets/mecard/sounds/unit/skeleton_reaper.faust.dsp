declare name "skeleton_reaper";
declare description "a rattle of bones and a blade";
declare duration "0.7";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
undead = library("lib/undead.lib.dsp");
weapon = library("lib/weapon.lib.dsp");

mix0(t) = (p(0,.6,undead.rattle) + p(.5,1,weapon.whoosh)*.8) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.146;
