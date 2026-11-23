declare name "weaver";
declare description "two cards woven: the shuttle twice, then the thread plucked taut";
declare duration "1.6";

import("sfx.lib");

v0(u) = ((no.noise : sfx.filter.sweep_bp(600,4000,2,u)) * sfx.env.decay(2.5,u) * 6) * sfx.env.fadeio(.002, .1, u);
v1(u) = ((no.noise : sfx.filter.sweep_bp(4000,600,2,u)) * sfx.env.decay(2.5,u) * 6) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.inst.pluck(ba.midikey2hz(88),u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.osc.fm(1200,1.41,2) * sfx.env.decay(5,u) * .5) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.3125, v0, t) * 0.5
    + sfx.sequence.part(0.25, 0.5625, v1, t) * 0.5
    + sfx.sequence.part(0.5625, 0.8125, v2, t) * 0.6
    + sfx.sequence.part(0.5625, 1, v3, t) * 0.25
) : sfx.fx.reverb(0.6, 0.1) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(0.2661);
