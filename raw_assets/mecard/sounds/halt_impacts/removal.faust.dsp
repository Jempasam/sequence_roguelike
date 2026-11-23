declare name "removal";
declare description "cards removed: paper crumpled, thrown away";
declare duration "0.5";

import("sfx.lib");

v0(u) = ((sfx.noise.white:sfx.filter.bpf(3000,.8))*sfx.env.decay(6,u)*2.5) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.perc.thud(u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.4000, v0, t) * 0.6
    +     sfx.sequence.part(0.5000, 1.0000, v1, t) * 0.8
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
