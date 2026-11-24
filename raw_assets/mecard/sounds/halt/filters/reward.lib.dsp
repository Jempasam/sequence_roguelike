declare name "reward";
declare description "the end of a halt in a bright, wide room";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");

filter(s, t) = finish.filter(0.7, 0.15, s, t);
