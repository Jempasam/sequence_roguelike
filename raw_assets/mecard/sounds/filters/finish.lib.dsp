declare name "finish";
declare description "the end of a halt: a room around the sound, the offset removed, a fade at both ends";

import("sfx.lib");

filter(room, damp, s, t) = s(t) : sfx.fx.reverb(room, damp) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
