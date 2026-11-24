declare name "forge";
declare description "two cards welded: hammer blow with sparks, then the quench and a ring";
declare duration "1.6";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/workshop.lib.dsp");
sizzle = library("../lib/halt_voices/sizzle.lib.dsp");

v0(u) = voice.filter(sfx.perc.clang(300), u);
v1(u) = voice.filter(\(u).(sfx.noise.crackle(.08) * sfx.env.decay(4,u) * 1.6), u);
v2(u) = voice.filter(sizzle.sound, u);
v3(u) = voice.filter(sfx.impact.metal(400,0.5), u);

mix(t) = (
    sfx.sequence.part(0, 0.4375, v0, t) * 0.7
    + sfx.sequence.part(0, 0.25, v1, t) * 0.5
    + sfx.sequence.part(0.2813, 1, v2, t) * 0.8
    + sfx.sequence.part(0.1875, 0.9375, v3, t) * 0.15
);

sound(t) = category.filter(mix, t) * 0.8035;

process(t) = sound(t);
