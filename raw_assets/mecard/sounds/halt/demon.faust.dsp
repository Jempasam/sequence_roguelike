declare name "demon";
declare description "the deck glued in pairs: the pact spoken, the fire roaring, the seal burning";
declare duration "2.2";

import("sfx.lib");

v0(u) = (sfx.sequence.seq3(sfx.voice.deep_say(7,0,80),sfx.voice.deep_say(1,4,75),sfx.voice.deep_say(10,0,70),u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.fire.roar(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.perc.boom(u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.fire.sizzle(u) * sfx.env.decay(3,u) * sfx.env.attack(.05,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.3636, v0, t) * 0.6
    + sfx.sequence.part(0.2727, 0.8182, v1, t) * 0.5
    + sfx.sequence.part(0.4545, 0.8182, v2, t) * 0.5
    + sfx.sequence.part(0.4545, 0.8182, v3, t) * 0.4
) : sfx.fx.reverb(0.9, 0.3) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.6218);
