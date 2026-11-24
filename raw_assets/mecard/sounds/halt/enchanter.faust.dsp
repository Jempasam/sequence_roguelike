declare name "enchanter";
declare description "a card enchanted: a chime rising, then a flash";
declare duration "1.4";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/neutral.lib.dsp");

v0(u) = voice.filter(sfx.sequence.arp3(ba.midikey2hz(84),ba.midikey2hz(88),ba.midikey2hz(91),sfx.inst.bell), u);
v1(u) = voice.filter(\(u).((no.noise : sfx.filter.sweep_bp(500,6000,2,u)) * sfx.env.decay(2.5,u) * 8), u);
v2(u) = voice.filter(sfx.retro.powerup, u);

mix(t) = (
    sfx.sequence.part(0, 0.5714, v0, t) * 0.5
    + sfx.sequence.part(0.5, 0.8571, v1, t) * 0.4
    + sfx.sequence.part(0.5, 0.8571, v2, t) * 0.4
);

sound(t) = category.filter(mix, t) * 0.5821;

process(t) = sound(t);
