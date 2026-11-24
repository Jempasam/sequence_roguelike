declare name "shop";
declare description "a good bought: three coins dropped into a wooden box, then the cash register rings";
declare duration "1.5";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/trade.lib.dsp");
coin_drop = library("../lib/halt_voices/coin_drop.lib.dsp");
cha_ching = library("../lib/halt_voices/cha_ching.lib.dsp");

v0(u) = voice.filter(coin_drop.sound, u);
v1(u) = voice.filter(sfx.impact.wood(300, 0.6), u);
v2(u) = voice.filter(coin_drop.sound, u);
v3(u) = voice.filter(sfx.impact.wood(270, 0.6), u);
v4(u) = voice.filter(coin_drop.sound, u);
v5(u) = voice.filter(sfx.impact.wood(240, 0.7), u);
v6(u) = voice.filter(cha_ching.sound, u);

mix(t) = (
    sfx.sequence.part(0, 0.2, v0, t) * 0.3
    + sfx.sequence.part(0.08, 0.2667, v1, t) * 0.8
    + sfx.sequence.part(0.2333, 0.4333, v2, t) * 0.3
    + sfx.sequence.part(0.3133, 0.5, v3, t) * 0.8
    + sfx.sequence.part(0.4333, 0.6333, v4, t) * 0.3
    + sfx.sequence.part(0.5133, 0.7, v5, t) * 0.9
    + sfx.sequence.part(0.65, 1, v6, t) * 0.7
);

sound(t) = category.filter(mix, t) * 1.7;

process(t) = sound(t);
