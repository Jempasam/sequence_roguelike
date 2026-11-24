declare name "great_merchant";
declare description "an item given three times: a rain of gold, the big deal gong";
declare duration "0.95";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
coin = library("../lib/halt_voices/coin.lib.dsp");

v0(u) = voice.filter(coin.sound, u);
v1(u) = voice.filter(coin.sound, u);
v2(u) = voice.filter(coin.sound, u);
v3(u) = voice.filter(coin.sound, u);
v4(u) = voice.filter(coin.sound, u);
v5(u) = voice.filter(coin.sound, u);
v6(u) = voice.filter(coin.sound, u);
v7(u) = voice.filter(sfx.orient.gong(300), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.2105, v0, t) * 0.4
    +     sfx.sequence.part(0.0737, 0.2842, v1, t) * 0.4
    +     sfx.sequence.part(0.1474, 0.3579, v2, t) * 0.4
    +     sfx.sequence.part(0.2211, 0.4316, v3, t) * 0.4
    +     sfx.sequence.part(0.2947, 0.5053, v4, t) * 0.4
    +     sfx.sequence.part(0.3684, 0.5789, v5, t) * 0.4
    +     sfx.sequence.part(0.4421, 0.6526, v6, t) * 0.4
    +     sfx.sequence.part(0.5263, 1.0000, v7, t) * 0.6
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
