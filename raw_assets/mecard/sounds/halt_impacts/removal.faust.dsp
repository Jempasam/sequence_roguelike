declare name "removal";
declare description "cards removed: paper crumpled, thrown away";
declare duration "0.5";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
thud = library("../lib/halt_voices/thud.lib.dsp");

v0(u) = voice.filter(\(u).((sfx.noise.white:sfx.filter.bpf(3000,.8))*sfx.env.decay(6,u)*2.5), u);
v1(u) = voice.filter(thud.sound, u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.4000, v0, t) * 0.6
    +     sfx.sequence.part(0.5000, 1.0000, v1, t) * 0.8
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
