declare name "master_trainer";
declare description "a master ally joins: three blows, a horn and a chord";
declare duration "2.4";

import("sfx.lib");

v0(u) = (sfx.impact.wood(450,0.9,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.perc.kick(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.wood(450,0.9,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.perc.kick(u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.impact.wood(450,0.9,u)) * sfx.env.fadeio(.002, .1, u);
v5(u) = (sfx.perc.kick(u)) * sfx.env.fadeio(.002, .1, u);
v6(u) = ((sfx.inst.organ(ba.midikey2hz(55),u) + sfx.inst.organ(ba.midikey2hz(60),u)) * 0.70) * sfx.env.fadeio(.002, .1, u);
v7(u) = ((sfx.inst.pad(ba.midikey2hz(48),u) + sfx.inst.pad(ba.midikey2hz(55),u) + sfx.inst.pad(ba.midikey2hz(60),u) + sfx.inst.pad(ba.midikey2hz(64),u)) * 0.35) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.1042, v0, t) * 0.7
    + sfx.sequence.part(0, 0.125, v1, t) * 0.5
    + sfx.sequence.part(0.125, 0.2292, v2, t) * 0.7
    + sfx.sequence.part(0.125, 0.25, v3, t) * 0.5
    + sfx.sequence.part(0.25, 0.3542, v4, t) * 0.7
    + sfx.sequence.part(0.25, 0.375, v5, t) * 0.5
    + sfx.sequence.part(0.4167, 0.7083, v6, t) * 0.5
    + sfx.sequence.part(0.5833, 1, v7, t) * 0.4
) : sfx.fx.reverb(0.6, 0.1) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.0965);
