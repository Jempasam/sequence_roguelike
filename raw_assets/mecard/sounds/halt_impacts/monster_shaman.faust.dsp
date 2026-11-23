declare name "monster_shaman";
declare description "a monster turned into a card: ritual drums, a bound cry";
declare duration "0.75";

import("sfx.lib");

v0(u) = (sfx.orient.taiko(110,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.orient.taiko(90,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.voice.grunt(100,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.3333, v0, t) * 0.8
    +     sfx.sequence.part(0.2667, 0.6000, v1, t) * 0.8
    +     sfx.sequence.part(0.5333, 1.0000, v2, t) * 0.8
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
