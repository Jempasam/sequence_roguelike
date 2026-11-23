declare name "monster_mage";
declare description "a monster turned into a card: a roar, an arcane flash";
declare duration "1.8";

import("sfx.lib");

v0(u) = (sfx.voice.grunt(110,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = ((no.noise : sfx.filter.sweep_bp(300,5000,2,u)) * sfx.env.decay(2.5,u) * 6) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.inst.bell(ba.midikey2hz(88),u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = ((sfx.inst.pad(ba.midikey2hz(57),u) + sfx.inst.pad(ba.midikey2hz(60),u) + sfx.inst.pad(ba.midikey2hz(64),u)) * 0.47) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.3333, v0, t) * 0.6
    + sfx.sequence.part(0.3333, 1, v1, t) * 0.35
    + sfx.sequence.part(0.3889, 0.8333, v2, t) * 0.4
    + sfx.sequence.part(0.4444, 1, v3, t) * 0.35
) : sfx.fx.reverb(0.7, 0.15) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.0116);
