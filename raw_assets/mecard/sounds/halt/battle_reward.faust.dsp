declare name "battle_reward";
declare description "a battle prize taken: a coin, then a three note fanfare over a warm pad";
declare duration "1.6";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/reward.lib.dsp");
coin = library("../lib/halt_voices/coin.lib.dsp");
lead_67 = library("../lib/halt_voices/lead_67.lib.dsp");
lead_72 = library("../lib/halt_voices/lead_72.lib.dsp");

v0(u) = voice.filter(coin.sound, u);
v1(u) = voice.filter(lead_67.sound, u);
v2(u) = voice.filter(lead_72.sound, u);
v3(u) = voice.filter(sfx.inst.lead(ba.midikey2hz(76)), u);
v4(u) = voice.filter(\(u).((sfx.inst.pad(ba.midikey2hz(60),u) + sfx.inst.pad(ba.midikey2hz(64),u) + sfx.inst.pad(ba.midikey2hz(67),u) + sfx.inst.pad(ba.midikey2hz(72),u)) * 0.35), u);

mix(t) = (
    sfx.sequence.part(0, 0.2187, v0, t) * 0.6
    + sfx.sequence.part(0.2187, 0.4688, v1, t) * 0.5
    + sfx.sequence.part(0.375, 0.625, v2, t) * 0.5
    + sfx.sequence.part(0.5313, 0.8438, v3, t) * 0.5
    + sfx.sequence.part(0.5, 1, v4, t) * 0.35
);

sound(t) = category.filter(mix, t) * 1.8836;

process(t) = sound(t);
