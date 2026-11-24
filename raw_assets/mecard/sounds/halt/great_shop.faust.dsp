declare name "great_shop";
declare description "goods bought in quantity: a double bell, four coins, a ring-out";
declare duration "2";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/trade.lib.dsp");
bell_79 = library("../lib/halt_voices/bell_79.lib.dsp");
bell_84 = library("../lib/halt_voices/bell_84.lib.dsp");
coin = library("../lib/halt_voices/coin.lib.dsp");

v0(u) = voice.filter(bell_79.sound, u);
v1(u) = voice.filter(bell_84.sound, u);
v2(u) = voice.filter(sfx.impact.cloth(0.4), u);
v3(u) = voice.filter(coin.sound, u);
v4(u) = voice.filter(coin.sound, u);
v5(u) = voice.filter(coin.sound, u);
v6(u) = voice.filter(coin.sound, u);
v7(u) = voice.filter(sfx.impact.metal(1200,0.5), u);

mix(t) = (
    sfx.sequence.part(0, 0.45, v0, t) * 0.6
    + sfx.sequence.part(0.06, 0.51, v1, t) * 0.6
    + sfx.sequence.part(0.05, 0.2, v2, t) * 0.3
    + sfx.sequence.part(0.25, 0.4, v3, t) * 0.5
    + sfx.sequence.part(0.35, 0.5, v4, t) * 0.5
    + sfx.sequence.part(0.45, 0.6, v5, t) * 0.5
    + sfx.sequence.part(0.55, 0.7, v6, t) * 0.5
    + sfx.sequence.part(0.6, 1, v7, t) * 0.3
);

sound(t) = category.filter(mix, t) * 1.8408;

process(t) = sound(t);
