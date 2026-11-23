declare name "elite_reward";
declare description "an elite prize taken: a drum, a burst of gold, a three note fanfare";
declare duration "2";

import("sfx.lib");

v0(u) = (sfx.perc.tom(110,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = ((sfx.noise.crackle(.1) : sfx.filter.bpf(4500,1.5)) * sfx.env.decay(2.5,u) * 2) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.inst.lead(ba.midikey2hz(67),u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.inst.lead(ba.midikey2hz(71),u)) * sfx.env.fadeio(.002, .1, u);
v5(u) = (sfx.inst.lead(ba.midikey2hz(74),u)) * sfx.env.fadeio(.002, .1, u);
v6(u) = ((sfx.inst.pad(ba.midikey2hz(62),u) + sfx.inst.pad(ba.midikey2hz(66),u) + sfx.inst.pad(ba.midikey2hz(69),u) + sfx.inst.pad(ba.midikey2hz(74),u)) * 0.35) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.2, v0, t) * 0.7
    + sfx.sequence.part(0.1, 0.4, v1, t) * 0.5
    + sfx.sequence.part(0.125, 0.3, v2, t) * 0.5
    + sfx.sequence.part(0.35, 0.525, v3, t) * 0.55
    + sfx.sequence.part(0.475, 0.65, v4, t) * 0.55
    + sfx.sequence.part(0.6, 0.9, v5, t) * 0.55
    + sfx.sequence.part(0.6, 1, v6, t) * 0.35
) : sfx.fx.reverb(0.7, 0.15) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.4289);
