declare name "elite_reward";
declare description "an elite prize taken: a drum, a burst of gold, a three note fanfare";
declare duration "2";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/reward.lib.dsp");
coin = library("../lib/halt_voices/coin.lib.dsp");
lead_67 = library("../lib/halt_voices/lead_67.lib.dsp");

v0(u) = voice.filter(sfx.perc.tom(110), u);
v1(u) = voice.filter(\(u).((sfx.noise.crackle(.1) : sfx.filter.bpf(4500,1.5)) * sfx.env.decay(2.5,u) * 2), u);
v2(u) = voice.filter(coin.sound, u);
v3(u) = voice.filter(lead_67.sound, u);
v4(u) = voice.filter(sfx.inst.lead(ba.midikey2hz(71)), u);
v5(u) = voice.filter(sfx.inst.lead(ba.midikey2hz(74)), u);
v6(u) = voice.filter(\(u).((sfx.inst.pad(ba.midikey2hz(62),u) + sfx.inst.pad(ba.midikey2hz(66),u) + sfx.inst.pad(ba.midikey2hz(69),u) + sfx.inst.pad(ba.midikey2hz(74),u)) * 0.35), u);

mix(t) = (
    sfx.sequence.part(0, 0.2, v0, t) * 0.7
    + sfx.sequence.part(0.1, 0.4, v1, t) * 0.5
    + sfx.sequence.part(0.125, 0.3, v2, t) * 0.5
    + sfx.sequence.part(0.35, 0.525, v3, t) * 0.55
    + sfx.sequence.part(0.475, 0.65, v4, t) * 0.55
    + sfx.sequence.part(0.6, 0.9, v5, t) * 0.55
    + sfx.sequence.part(0.6, 1, v6, t) * 0.35
);

sound(t) = category.filter(mix, t) * 1.4289;

process(t) = sound(t);
