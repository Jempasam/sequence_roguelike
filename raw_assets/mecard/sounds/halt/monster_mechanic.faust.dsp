declare name "monster_mechanic";
declare description "a monster turned into a card: a wrench blow, a motor, two beeps";
declare duration "1.6";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/workshop.lib.dsp");
servo = library("../lib/halt_voices/servo.lib.dsp");

v0(u) = voice.filter(sfx.perc.clang(500), u);
v1(u) = voice.filter(servo.sound, u);
v2(u) = voice.filter(sfx.mech.beep(1200), u);
v3(u) = voice.filter(sfx.mech.beep(1500), u);

mix(t) = (
    sfx.sequence.part(0, 0.25, v0, t) * 0.8
    + sfx.sequence.part(0.1875, 0.5, v1, t) * 0.5
    + sfx.sequence.part(0.625, 0.7813, v2, t) * 0.5
    + sfx.sequence.part(0.75, 0.9062, v3, t) * 0.5
);

sound(t) = category.filter(mix, t) * 1.6218;

process(t) = sound(t);
