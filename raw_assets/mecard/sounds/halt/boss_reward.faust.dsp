declare name "boss_reward";
declare description "a boss prize taken: a boom, a pile of gold, a five note fanfare crowned by a choir";
declare duration "2.8";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/reward.lib.dsp");
bell_84 = library("../lib/halt_voices/bell_84.lib.dsp");
boom = library("../lib/halt_voices/boom.lib.dsp");
lead_67 = library("../lib/halt_voices/lead_67.lib.dsp");
lead_72 = library("../lib/halt_voices/lead_72.lib.dsp");

v0(u) = voice.filter(boom.sound, u);
v1(u) = voice.filter(sfx.sequence.euclid(5,8,0,sfx.perc.tom(90)), u);
v2(u) = voice.filter(\(u).((sfx.noise.crackle(.1) : sfx.filter.bpf(4500,1.5)) * sfx.env.decay(2.5,u) * 2 + sfx.impact.metal(1800,0.6,u) * .5), u);
v3(u) = voice.filter(lead_67.sound, u);
v4(u) = voice.filter(lead_72.sound, u);
v5(u) = voice.filter(sfx.inst.lead(ba.midikey2hz(76)), u);
v6(u) = voice.filter(sfx.inst.lead(ba.midikey2hz(79)), u);
v7(u) = voice.filter(sfx.inst.organ(ba.midikey2hz(84)), u);
v8(u) = voice.filter(\(u).((sfx.voice.ah(ba.midikey2hz(60),u) + sfx.voice.ah(ba.midikey2hz(64),u) + sfx.voice.ah(ba.midikey2hz(67),u) + sfx.voice.ah(ba.midikey2hz(72),u)) * 0.35), u);
v9(u) = voice.filter(bell_84.sound, u);

mix(t) = (
    sfx.sequence.part(0, 0.3571, v0, t) * 0.8
    + sfx.sequence.part(0.1071, 0.3571, v1, t) * 0.5
    + sfx.sequence.part(0.2857, 0.5714, v2, t) * 0.5
    + sfx.sequence.part(0.4286, 0.5357, v3, t) * 0.55
    + sfx.sequence.part(0.5179, 0.625, v4, t) * 0.55
    + sfx.sequence.part(0.6071, 0.7143, v5, t) * 0.55
    + sfx.sequence.part(0.6964, 0.8036, v6, t) * 0.55
    + sfx.sequence.part(0.7857, 1, v7, t) * 0.55
    + sfx.sequence.part(0.5714, 1, v8, t) * 0.4
    + sfx.sequence.part(0.6786, 1, v9, t) * 0.4
);

sound(t) = category.filter(mix, t) * 1.3964;

process(t) = sound(t);
