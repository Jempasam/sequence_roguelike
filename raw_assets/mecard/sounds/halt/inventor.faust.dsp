declare name "inventor";
declare description "a card given: the machine turns, the card comes out, success";
declare duration "1.8";

import("sfx.lib");

v0(u) = (sfx.mech.servo(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.sequence.euclid(5,8,0,sfx.mech.click,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.metal(600,0.7,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.impact.cloth(0.4,u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.inst.pluck(ba.midikey2hz(72),u)) * sfx.env.fadeio(.002, .1, u);
v5(u) = (sfx.inst.pluck(ba.midikey2hz(79),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.4444, v0, t) * 0.5
    + sfx.sequence.part(0.0556, 0.5556, v1, t) * 0.4
    + sfx.sequence.part(0.5, 0.6667, v2, t) * 0.5
    + sfx.sequence.part(0.5556, 0.7778, v3, t) * 0.4
    + sfx.sequence.part(0.6667, 0.8333, v4, t) * 0.5
    + sfx.sequence.part(0.7778, 1, v5, t) * 0.5
) : sfx.fx.reverb(0.5, 0.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(0.7674);
