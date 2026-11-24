declare name "shop";
declare description "a good bought: a coin dropped into a wooden box, twice, then the cash register rings";
declare duration "0.8";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
coin_drop = library("../lib/halt_voices/coin_drop.lib.dsp");
cha_ching = library("../lib/halt_voices/cha_ching.lib.dsp");

v0(u) = voice.filter(coin_drop.sound, u);
v1(u) = voice.filter(sfx.impact.wood(300, 0.6), u);
v2(u) = voice.filter(coin_drop.sound, u);
v3(u) = voice.filter(sfx.impact.wood(250, 0.8), u);
v4(u) = voice.filter(cha_ching.sound, u);

mix(t) = (
    sfx.sequence.part(0, 0.3125, v0, t) * 0.3
    + sfx.sequence.part(0.125, 0.375, v1, t) * 0.8
    + sfx.sequence.part(0.25, 0.5625, v2, t) * 0.3
    + sfx.sequence.part(0.375, 0.625, v3, t) * 0.9
    + sfx.sequence.part(0.55, 1, v4, t) * 0.8
);

sound(t) = category.filter(mix, t) * 1.6;

process(t) = sound(t);
