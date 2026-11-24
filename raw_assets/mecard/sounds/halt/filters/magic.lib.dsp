declare name "magic";
declare description "the end of a halt in a deep, wide room";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");

filter(s, t) = finish.filter(0.8, 0.2, s, t);
