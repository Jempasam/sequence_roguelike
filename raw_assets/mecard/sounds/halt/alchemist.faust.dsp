declare name "alchemist";
declare description "two upgraded copies: the potion bubbles, a glass note per copy";
declare duration "1.8";

import("sfx.lib");

v0(u) = (sfx.water.bubbling(8,2,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.inst.bell(ba.midikey2hz(88),u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.inst.bell(ba.midikey2hz(91),u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.fire.sizzle(u) * sfx.env.decay(3,u) * sfx.env.attack(.05,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.6667, v0, t) * 0.5
    + sfx.sequence.part(0.3889, 0.6111, v1, t) * 0.5
    + sfx.sequence.part(0.5556, 0.7778, v2, t) * 0.5
    + sfx.sequence.part(0.7222, 1, v3, t) * 0.4
) : sfx.fx.reverb(0.6, 0.1) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(2.138);
