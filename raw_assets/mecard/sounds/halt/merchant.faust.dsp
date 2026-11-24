declare name "merchant";
declare description "an item given: gold paid, the item handed over, a satisfied note";
declare duration "1.5";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/trade.lib.dsp");
cloth_05 = library("../lib/halt_voices/cloth_05.lib.dsp");
coin = library("../lib/halt_voices/coin.lib.dsp");
pluck_67 = library("../lib/halt_voices/pluck_67.lib.dsp");
pluck_72 = library("../lib/halt_voices/pluck_72.lib.dsp");

v0(u) = voice.filter(coin.sound, u);
v1(u) = voice.filter(coin.sound, u);
v2(u) = voice.filter(cloth_05.sound, u);
v3(u) = voice.filter(pluck_67.sound, u);
v4(u) = voice.filter(pluck_72.sound, u);
v5(u) = voice.filter(sfx.impact.metal(1500,0.4), u);

mix(t) = (
    sfx.sequence.part(0, 0.2, v0, t) * 0.6
    + sfx.sequence.part(0.1, 0.3, v1, t) * 0.6
    + sfx.sequence.part(0.3333, 0.5333, v2, t) * 0.6
    + sfx.sequence.part(0.5333, 0.8, v3, t) * 0.5
    + sfx.sequence.part(0.6667, 1, v4, t) * 0.5
    + sfx.sequence.part(0.2, 1, v5, t) * 0.25
);

sound(t) = category.filter(mix, t) * 1.6788;

process(t) = sound(t);
