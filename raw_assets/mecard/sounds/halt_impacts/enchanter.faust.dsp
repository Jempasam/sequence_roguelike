declare name "enchanter";
declare description "a card enchanted: a chime rising, then a flash";
declare duration "1";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
bell_79 = library("../lib/halt_voices/bell_79.lib.dsp");
bell_84 = library("../lib/halt_voices/bell_84.lib.dsp");

v0(u) = voice.filter(sfx.inst.bell(ba.midikey2hz(72)), u);
v1(u) = voice.filter(sfx.inst.bell(ba.midikey2hz(76)), u);
v2(u) = voice.filter(bell_79.sound, u);
v3(u) = voice.filter(bell_84.sound, u);
v4(u) = voice.filter(\(u).(sfx.osc.fm(1568,1.41,1)*sfx.env.decay(7,u)*sfx.env.attack(.02,u)), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.3000, v0, t) * 0.6
    +     sfx.sequence.part(0.1000, 0.4000, v1, t) * 0.6
    +     sfx.sequence.part(0.2000, 0.5000, v2, t) * 0.6
    +     sfx.sequence.part(0.3000, 0.6000, v3, t) * 0.6
    +     sfx.sequence.part(0.4000, 1.0000, v4, t) * 0.35
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
