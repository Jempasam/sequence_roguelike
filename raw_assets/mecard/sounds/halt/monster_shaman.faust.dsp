declare name "monster_shaman";
declare description "a monster turned into a card: ritual drums, a bound cry";
declare duration "2";

import("sfx.lib");

v0(u) = (sfx.sequence.euclid(5,8,0,sfx.perc.tom(130),u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.voice.squeak(400,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = ((sfx.noise.crackle(.1) : sfx.filter.bpf(6000,1.5)) * sfx.env.decay(3,u) * 2) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.65, v0, t) * 0.6
    + sfx.sequence.part(0.65, 0.9, v1, t) * 0.5
    + sfx.sequence.part(0.6, 1, v2, t) * 0.3
) : sfx.fx.reverb(0.7, 0.15) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.5849);
