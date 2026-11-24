declare name "dark_demon";
declare description "a monster taken for the deck: the demon speaks, the bargain chord";
declare duration "2.2";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/dark.lib.dsp");
boom = library("../lib/halt_voices/boom.lib.dsp");

v0(u) = voice.filter(sfx.sequence.seq3(sfx.voice.deep_say(7,0,70),sfx.voice.deep_say(1,4,65),sfx.voice.deep_say(10,0,60)), u);
v1(u) = voice.filter(\(u).((sfx.inst.organ(ba.midikey2hz(45),u) + sfx.inst.organ(ba.midikey2hz(48),u) + sfx.inst.organ(ba.midikey2hz(52),u) + sfx.inst.organ(ba.midikey2hz(57),u)) * 0.35), u);
v2(u) = voice.filter(boom.sound, u);

mix(t) = (
    sfx.sequence.part(0, 0.4091, v0, t) * 0.6
    + sfx.sequence.part(0.4545, 1, v1, t) * 0.45
    + sfx.sequence.part(0.4545, 0.8182, v2, t) * 0.6
);

sound(t) = category.filter(mix, t) * 1.5668;

process(t) = sound(t);
