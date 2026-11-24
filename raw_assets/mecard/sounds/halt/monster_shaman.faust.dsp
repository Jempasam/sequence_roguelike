declare name "monster_shaman";
declare description "a monster turned into a card: ritual drums, a bound cry";
declare duration "2";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/reward.lib.dsp");

v0(u) = voice.filter(sfx.sequence.euclid(5,8,0,sfx.perc.tom(130)), u);
v1(u) = voice.filter(sfx.voice.squeak(400), u);
v2(u) = voice.filter(\(u).((sfx.noise.crackle(.1) : sfx.filter.bpf(6000,1.5)) * sfx.env.decay(3,u) * 2), u);

mix(t) = (
    sfx.sequence.part(0, 0.65, v0, t) * 0.6
    + sfx.sequence.part(0.65, 0.9, v1, t) * 0.5
    + sfx.sequence.part(0.6, 1, v2, t) * 0.3
);

sound(t) = category.filter(mix, t) * 1.5849;

process(t) = sound(t);
