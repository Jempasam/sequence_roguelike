declare name "elf_archer";
declare description "an arrow and a crystal note";
declare duration "0.6";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
magic = library("lib/magic.lib.dsp");
weapon = library("lib/weapon.lib.dsp");

mix0(t) = (p(0,.6,weapon.twang(440)) + p(.3,1,magic.chime(1100))*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.738;
