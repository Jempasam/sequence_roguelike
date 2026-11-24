declare name "geomancer";
declare description "an earth rumble";
declare duration "0.8";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
magic = library("lib/magic.lib.dsp");
element = library("lib/element.lib.dsp");

mix0(t) = (p(0,.8,element.earth) + p(.4,1,magic.cast(200,600))*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.367;
