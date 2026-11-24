declare name "monster_mage";
declare description "a monster turned into a card: a roar, an arcane flash";
declare duration "1.8";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/reward.lib.dsp");
bell_88 = library("../lib/halt_voices/bell_88.lib.dsp");

v0(u) = voice.filter(sfx.voice.grunt(110), u);
v1(u) = voice.filter(\(u).((no.noise : sfx.filter.sweep_bp(300,5000,2,u)) * sfx.env.decay(2.5,u) * 6), u);
v2(u) = voice.filter(bell_88.sound, u);
v3(u) = voice.filter(\(u).((sfx.inst.pad(ba.midikey2hz(57),u) + sfx.inst.pad(ba.midikey2hz(60),u) + sfx.inst.pad(ba.midikey2hz(64),u)) * 0.47), u);

mix(t) = (
    sfx.sequence.part(0, 0.3333, v0, t) * 0.6
    + sfx.sequence.part(0.3333, 1, v1, t) * 0.35
    + sfx.sequence.part(0.3889, 0.8333, v2, t) * 0.4
    + sfx.sequence.part(0.4444, 1, v3, t) * 0.35
);

sound(t) = category.filter(mix, t) * 1.0116;

process(t) = sound(t);
