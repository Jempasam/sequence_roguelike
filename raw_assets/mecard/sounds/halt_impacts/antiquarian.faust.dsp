declare name "antiquarian";
declare description "a card sold: the shop bell, then the gold received";
declare duration "0.6";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
bell_79 = library("../lib/halt_voices/bell_79.lib.dsp");
coin = library("../lib/halt_voices/coin.lib.dsp");

v0(u) = voice.filter(bell_79.sound, u);
v1(u) = voice.filter(coin.sound, u);
v2(u) = voice.filter(coin.sound, u);
v3(u) = voice.filter(coin.sound, u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.8333, v0, t) * 0.6
    +     sfx.sequence.part(0.2500, 0.5833, v1, t) * 0.5
    +     sfx.sequence.part(0.4167, 0.7500, v2, t) * 0.5
    +     sfx.sequence.part(0.5833, 0.9167, v3, t) * 0.5
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
