declare name "great_merchant";
declare description "an item given three times: a rain of gold, the big deal gong";
declare duration "2.4";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/trade.lib.dsp");
cloth_05 = library("../lib/halt_voices/cloth_05.lib.dsp");
coin = library("../lib/halt_voices/coin.lib.dsp");

v0(u) = voice.filter(\(u).((sfx.noise.crackle(.1) : sfx.filter.bpf(4500,1.5)) * sfx.env.decay(2.5,u) * 2), u);
v1(u) = voice.filter(coin.sound, u);
v2(u) = voice.filter(coin.sound, u);
v3(u) = voice.filter(coin.sound, u);
v4(u) = voice.filter(sfx.orient.gong(110), u);
v5(u) = voice.filter(cloth_05.sound, u);

mix(t) = (
    sfx.sequence.part(0, 0.5, v0, t) * 0.5
    + sfx.sequence.part(0.125, 0.25, v1, t) * 0.5
    + sfx.sequence.part(0.2083, 0.3333, v2, t) * 0.5
    + sfx.sequence.part(0.2917, 0.4167, v3, t) * 0.5
    + sfx.sequence.part(0.4167, 1, v4, t) * 0.7
    + sfx.sequence.part(0.4167, 0.5417, v5, t) * 0.3
);

sound(t) = category.filter(mix, t) * 1.7179;

process(t) = sound(t);
