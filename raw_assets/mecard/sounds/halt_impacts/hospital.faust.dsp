declare name "hospital";
declare description "hearts restored: the monitor beep, life coming back";
declare duration "0.85";

import("sfx.lib");

v0(u) = (sfx.mech.beep(880,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = ((sfx.inst.bell(ba.midikey2hz(72),u)+sfx.inst.bell(ba.midikey2hz(76),u)+sfx.inst.bell(ba.midikey2hz(79),u))*.5) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.2353, v0, t) * 0.5
    +     sfx.sequence.part(0.2941, 1.0000, v1, t) * 0.7
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
