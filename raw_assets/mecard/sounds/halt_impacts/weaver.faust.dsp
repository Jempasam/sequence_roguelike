declare name "weaver";
declare description "two cards woven: the shuttle, then the thread plucked taut";
declare duration "0.75";

import("sfx.lib");

v0(u) = (sfx.impact.cloth(.6,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.impact.cloth(.6,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.inst.pluck(ba.midikey2hz(67),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.2000, v0, t) * 0.8
    +     sfx.sequence.part(0.2000, 0.4000, v1, t) * 0.8
    +     sfx.sequence.part(0.4667, 1.0000, v2, t) * 1
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
