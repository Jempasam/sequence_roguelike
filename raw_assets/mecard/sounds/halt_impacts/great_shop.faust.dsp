declare name "great_shop";
declare description "goods bought in quantity: double bell, four coins";
declare duration "0.75";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
bell_79 = library("../lib/halt_voices/bell_79.lib.dsp");
bell_84 = library("../lib/halt_voices/bell_84.lib.dsp");
coin = library("../lib/halt_voices/coin.lib.dsp");

v0(u) = voice.filter(bell_84.sound, u);
v1(u) = voice.filter(bell_79.sound, u);
v2(u) = voice.filter(coin.sound, u);
v3(u) = voice.filter(coin.sound, u);
v4(u) = voice.filter(coin.sound, u);
v5(u) = voice.filter(coin.sound, u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.5333, v0, t) * 0.5
    +     sfx.sequence.part(0.1600, 0.6667, v1, t) * 0.5
    +     sfx.sequence.part(0.3333, 0.6000, v2, t) * 0.4
    +     sfx.sequence.part(0.4400, 0.7067, v3, t) * 0.4
    +     sfx.sequence.part(0.5467, 0.8133, v4, t) * 0.4
    +     sfx.sequence.part(0.6533, 0.9200, v5, t) * 0.4
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
