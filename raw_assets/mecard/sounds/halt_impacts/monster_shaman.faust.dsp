declare name "monster_shaman";
declare description "a monster turned into a card: ritual drums, a bound cry";
declare duration "0.75";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");

v0(u) = voice.filter(sfx.orient.taiko(110), u);
v1(u) = voice.filter(sfx.orient.taiko(90), u);
v2(u) = voice.filter(sfx.voice.grunt(100), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.3333, v0, t) * 0.8
    +     sfx.sequence.part(0.2667, 0.6000, v1, t) * 0.8
    +     sfx.sequence.part(0.5333, 1.0000, v2, t) * 0.8
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
