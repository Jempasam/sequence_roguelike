declare name "great_hospital";
declare description "full heal: the monitor, then a long healing chord";
declare duration "2.6";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/magic.lib.dsp");
beep_880 = library("../lib/halt_voices/beep_880.lib.dsp");

v0(u) = voice.filter(beep_880.sound, u);
v1(u) = voice.filter(beep_880.sound, u);
v2(u) = voice.filter(beep_880.sound, u);
v3(u) = voice.filter(\(u).((sfx.voice.ah(ba.midikey2hz(60),u) + sfx.voice.ah(ba.midikey2hz(64),u) + sfx.voice.ah(ba.midikey2hz(67),u) + sfx.voice.ah(ba.midikey2hz(72),u)) * 0.35), u);
v4(u) = voice.filter(sfx.inst.bell(ba.midikey2hz(91)), u);

mix(t) = (
    sfx.sequence.part(0, 0.0962, v0, t) * 0.5
    + sfx.sequence.part(0.1346, 0.2308, v1, t) * 0.5
    + sfx.sequence.part(0.2692, 0.3654, v2, t) * 0.5
    + sfx.sequence.part(0.3077, 1, v3, t) * 0.4
    + sfx.sequence.part(0.5385, 0.8462, v4, t) * 0.3
);

sound(t) = category.filter(mix, t) * 2.3988;

process(t) = sound(t);
