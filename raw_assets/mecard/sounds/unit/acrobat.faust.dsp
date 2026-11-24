declare name "acrobat";
declare description "a high hah and a flip";
declare duration "0.6";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
weapon = library("lib/weapon.lib.dsp");
cloth_05 = library("../lib/halt_voices/cloth_05.lib.dsp");

mix0(t) = (p(0,.3,human.hah(350)) + p(.2,.9,weapon.whoosh)*.3 + p(.1,.7,cloth_05.sound)*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.38;
