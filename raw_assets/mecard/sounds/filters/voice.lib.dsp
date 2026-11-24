declare name "voice";
declare description "the envelope of every voice of a halt: a very short fade at both ends";

import("sfx.lib");

filter(s, t) = s(t) * sfx.env.fadeio(.002, .1, t);
