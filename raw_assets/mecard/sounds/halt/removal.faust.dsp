declare name "removal";
declare description "cards removed: paper crumpled, thrown, the bin";
declare duration "1.2";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/neutral.lib.dsp");

v0(u) = voice.filter(\(u).((sfx.noise.crackle(.08) : sfx.filter.bpf(3000,1.2)) * sfx.env.decay(2,u) * 2), u);
v1(u) = voice.filter(sfx.weather.gust, u);
v2(u) = voice.filter(sfx.impact.plastic(300,0.6), u);

mix(t) = (
    sfx.sequence.part(0, 0.5, v0, t) * 0.6
    + sfx.sequence.part(0.4167, 0.6667, v1, t) * 0.4
    + sfx.sequence.part(0.6667, 0.9167, v2, t) * 0.6
);

sound(t) = category.filter(mix, t) * 1.9275;

process(t) = sound(t);
