declare name "antiquarian";
declare description "a card sold: the old shop bell, a clock tick, the gold received";
declare duration "1.6";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/trade.lib.dsp");
coin = library("../lib/halt_voices/coin.lib.dsp");

v0(u) = voice.filter(sfx.inst.bell(ba.midikey2hz(76)), u);
v1(u) = voice.filter(sfx.impact.cloth(0.3), u);
v2(u) = voice.filter(sfx.impact.wood(700,0.7), u);
v3(u) = voice.filter(coin.sound, u);
v4(u) = voice.filter(sfx.inst.marimba(ba.midikey2hz(64)), u);

mix(t) = (
    sfx.sequence.part(0, 0.5625, v0, t) * 0.6
    + sfx.sequence.part(0.0625, 0.25, v1, t) * 0.3
    + sfx.sequence.part(0.375, 0.5313, v2, t) * 0.4
    + sfx.sequence.part(0.5625, 0.8125, v3, t) * 0.5
    + sfx.sequence.part(0.625, 1, v4, t) * 0.3
);

sound(t) = category.filter(mix, t) * 2.4547;

process(t) = sound(t);
