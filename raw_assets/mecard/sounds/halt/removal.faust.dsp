declare name "removal";
declare description "cards removed: paper crumpled, thrown, the bin";
declare duration "1.2";

import("sfx.lib");

v0(u) = ((sfx.noise.crackle(.08) : sfx.filter.bpf(3000,1.2)) * sfx.env.decay(2,u) * 2) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.weather.gust(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.plastic(300,0.6,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.5, v0, t) * 0.6
    + sfx.sequence.part(0.4167, 0.6667, v1, t) * 0.4
    + sfx.sequence.part(0.6667, 0.9167, v2, t) * 0.6
) : sfx.fx.reverb(0.6, 0.1) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.9275);
