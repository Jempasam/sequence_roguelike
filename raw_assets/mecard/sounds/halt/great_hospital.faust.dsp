declare name "great_hospital";
declare description "full heal: the monitor, then a long healing chord";
declare duration "2.6";

import("sfx.lib");

v0(u) = (sfx.mech.beep(880,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.mech.beep(880,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.mech.beep(880,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = ((sfx.voice.ah(ba.midikey2hz(60),u) + sfx.voice.ah(ba.midikey2hz(64),u) + sfx.voice.ah(ba.midikey2hz(67),u) + sfx.voice.ah(ba.midikey2hz(72),u)) * 0.35) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.inst.bell(ba.midikey2hz(91),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.0962, v0, t) * 0.5
    + sfx.sequence.part(0.1346, 0.2308, v1, t) * 0.5
    + sfx.sequence.part(0.2692, 0.3654, v2, t) * 0.5
    + sfx.sequence.part(0.3077, 1, v3, t) * 0.4
    + sfx.sequence.part(0.5385, 0.8462, v4, t) * 0.3
) : sfx.fx.reverb(0.8, 0.2) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(2.3988);
