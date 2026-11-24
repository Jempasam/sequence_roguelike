declare name "elf_assassin";
declare description "a silent blade and a breath";
declare duration "0.5";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
ghost = library("lib/ghost.lib.dsp");
magic = library("lib/magic.lib.dsp");
weapon = library("lib/weapon.lib.dsp");

mix0(t) = (p(0,.5,weapon.blade)*.6 + p(0,.8,ghost.breath)*.2 + p(.3,1,magic.chime(1400))*.3) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.804;
