declare name "demon";
declare description "the deck glued in pairs: the pact spoken, the seal burning";
declare duration "1";

import("sfx.lib");

v0(u) = (sfx.voice.deep_say(0,4,80,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.voice.deep_say(0,0,72,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.voice.deep_say(0,5,66,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.perc.boom(u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.fire.sizzle(u)*sfx.env.decay(3,u)*sfx.env.attack(.05,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.2000, v0, t) * 1
    +     sfx.sequence.part(0.1700, 0.3700, v1, t) * 1
    +     sfx.sequence.part(0.3400, 0.5400, v2, t) * 1
    +     sfx.sequence.part(0.5000, 1.0000, v3, t) * 0.8
    +     sfx.sequence.part(0.5000, 0.9000, v4, t) * 0.7
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
