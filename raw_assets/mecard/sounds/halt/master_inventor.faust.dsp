declare name "master_inventor";
declare description "cards given: a stronger machine, steam, a double success";
declare duration "2.4";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/workshop.lib.dsp");
bell_88 = library("../lib/halt_voices/bell_88.lib.dsp");
confirm = library("../lib/halt_voices/confirm.lib.dsp");

v0(u) = voice.filter(sfx.mech.engine(80), u);
v1(u) = voice.filter(\(u).(sfx.noise.hiss(3000) * sfx.env.decay(3,u) * 1.5), u);
v2(u) = voice.filter(sfx.retro.powerup, u);
v3(u) = voice.filter(bell_88.sound, u);
v4(u) = voice.filter(confirm.sound, u);

mix(t) = (
    sfx.sequence.part(0, 0.5, v0, t) * 0.5
    + sfx.sequence.part(0.375, 0.5417, v1, t) * 0.3
    + sfx.sequence.part(0.5417, 0.7917, v2, t) * 0.5
    + sfx.sequence.part(0.6667, 0.875, v3, t) * 0.5
    + sfx.sequence.part(0.75, 0.9167, v4, t) * 0.4
);

sound(t) = category.filter(mix, t) * 1.0351;

process(t) = sound(t);
