declare name "boss_reward";
declare description "a boss prize taken: a boom, a pile of gold, a five note fanfare crowned by a choir";
declare duration "2.8";

import("sfx.lib");

v0(u) = (sfx.perc.boom(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.sequence.euclid(5,8,0,sfx.perc.tom(90),u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = ((sfx.noise.crackle(.1) : sfx.filter.bpf(4500,1.5)) * sfx.env.decay(2.5,u) * 2 + sfx.impact.metal(1800,0.6,u) * .5) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.inst.lead(ba.midikey2hz(67),u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.inst.lead(ba.midikey2hz(72),u)) * sfx.env.fadeio(.002, .1, u);
v5(u) = (sfx.inst.lead(ba.midikey2hz(76),u)) * sfx.env.fadeio(.002, .1, u);
v6(u) = (sfx.inst.lead(ba.midikey2hz(79),u)) * sfx.env.fadeio(.002, .1, u);
v7(u) = (sfx.inst.organ(ba.midikey2hz(84),u)) * sfx.env.fadeio(.002, .1, u);
v8(u) = ((sfx.voice.ah(ba.midikey2hz(60),u) + sfx.voice.ah(ba.midikey2hz(64),u) + sfx.voice.ah(ba.midikey2hz(67),u) + sfx.voice.ah(ba.midikey2hz(72),u)) * 0.35) * sfx.env.fadeio(.002, .1, u);
v9(u) = (sfx.inst.bell(ba.midikey2hz(84),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
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
) : sfx.fx.reverb(0.7, 0.15) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.3964);
