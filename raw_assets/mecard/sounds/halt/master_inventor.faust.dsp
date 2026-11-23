declare name "master_inventor";
declare description "cards given: a stronger machine, steam, a double success";
declare duration "2.4";

import("sfx.lib");

v0(u) = (sfx.mech.engine(80,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.noise.hiss(3000) * sfx.env.decay(3,u) * 1.5) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.retro.powerup(u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.inst.bell(ba.midikey2hz(88),u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.retro.confirm(u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.5, v0, t) * 0.5
    + sfx.sequence.part(0.375, 0.5417, v1, t) * 0.3
    + sfx.sequence.part(0.5417, 0.7917, v2, t) * 0.5
    + sfx.sequence.part(0.6667, 0.875, v3, t) * 0.5
    + sfx.sequence.part(0.75, 0.9167, v4, t) * 0.4
) : sfx.fx.reverb(0.5, 0.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.0351);
