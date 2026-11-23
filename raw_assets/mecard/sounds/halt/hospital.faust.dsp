declare name "hospital";
declare description "hearts restored: the monitor beeps, life coming back";
declare duration "1.8";

import("sfx.lib");

v0(u) = (sfx.mech.beep(880,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.mech.beep(880,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.orient.gliss(ba.midikey2hz(55),ba.midikey2hz(67),sfx.inst.pad,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.inst.epiano(ba.midikey2hz(72),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.1389, v0, t) * 0.5
    + sfx.sequence.part(0.1944, 0.3333, v1, t) * 0.5
    + sfx.sequence.part(0.3333, 1, v2, t) * 0.4
    + sfx.sequence.part(0.5556, 0.8889, v3, t) * 0.4
) : sfx.fx.reverb(0.8, 0.2) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(2.4266);
