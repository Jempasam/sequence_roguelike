declare name "master_chest";
declare description "rare cards given: combination lock, the vault door, gems";
declare duration "2.6";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/chest.lib.dsp");
latch = library("../lib/halt_voices/latch.lib.dsp");
servo = library("../lib/halt_voices/servo.lib.dsp");

v0(u) = voice.filter(sfx.sequence.euclid(4,4,0,sfx.mech.click), u);
v1(u) = voice.filter(latch.sound, u);
v2(u) = voice.filter(servo.sound, u);
v3(u) = voice.filter(sfx.perc.clang(90), u);
v4(u) = voice.filter(sfx.sequence.arp3(ba.midikey2hz(88),ba.midikey2hz(91),ba.midikey2hz(95),sfx.inst.bell), u);

mix(t) = (
    sfx.sequence.part(0, 0.3077, v0, t) * 0.5
    + sfx.sequence.part(0.3462, 0.4615, v1, t) * 0.7
    + sfx.sequence.part(0.3846, 0.6538, v2, t) * 0.5
    + sfx.sequence.part(0.3846, 0.6538, v3, t) * 0.6
    + sfx.sequence.part(0.6538, 1, v4, t) * 0.4
);

sound(t) = category.filter(mix, t) * 0.6026;

process(t) = sound(t);
