declare name "dark_strategist";
declare description "cards swapped with a monster: the low order, two cards exchanged";
declare duration "1.8";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/dark.lib.dsp");
cloth_05 = library("../lib/halt_voices/cloth_05.lib.dsp");

v0(u) = voice.filter(sfx.voice.grunt(70), u);
v1(u) = voice.filter(cloth_05.sound, u);
v2(u) = voice.filter(cloth_05.sound, u);
v3(u) = voice.filter(\(u).((sfx.inst.organ(ba.midikey2hz(57),u) + sfx.inst.organ(ba.midikey2hz(60),u) + sfx.inst.organ(ba.midikey2hz(64),u)) * 0.47), u);

mix(t) = (
    sfx.sequence.part(0, 0.3333, v0, t) * 0.6
    + sfx.sequence.part(0.3889, 0.5556, v1, t) * 0.5
    + sfx.sequence.part(0.5, 0.6667, v2, t) * 0.5
    + sfx.sequence.part(0.6111, 1, v3, t) * 0.4
);

sound(t) = category.filter(mix, t) * 1.8408;

process(t) = sound(t);
