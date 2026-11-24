declare name "hospital";
declare description "hearts restored: the monitor beeps, life coming back";
declare duration "1.8";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/magic.lib.dsp");
beep_880 = library("../lib/halt_voices/beep_880.lib.dsp");

v0(u) = voice.filter(beep_880.sound, u);
v1(u) = voice.filter(beep_880.sound, u);
v2(u) = voice.filter(sfx.orient.gliss(ba.midikey2hz(55),ba.midikey2hz(67),sfx.inst.pad), u);
v3(u) = voice.filter(sfx.inst.epiano(ba.midikey2hz(72)), u);

mix(t) = (
    sfx.sequence.part(0, 0.1389, v0, t) * 0.5
    + sfx.sequence.part(0.1944, 0.3333, v1, t) * 0.5
    + sfx.sequence.part(0.3333, 1, v2, t) * 0.4
    + sfx.sequence.part(0.5556, 0.8889, v3, t) * 0.4
);

sound(t) = category.filter(mix, t) * 2.4266;

process(t) = sound(t);
