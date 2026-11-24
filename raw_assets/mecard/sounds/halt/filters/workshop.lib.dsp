declare name "workshop";
declare description "the end of a halt in a small, dry room";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");

filter(s, t) = finish.filter(0.5, 0.08, s, t);
