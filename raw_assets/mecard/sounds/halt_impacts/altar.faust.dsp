declare name "altar";
declare description "two cards sacrificed, one copied: the gong, then the prayer accepting";
declare duration "1";

import("sfx.lib");

v0(u) = (sfx.orient.gong(180,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.voice.monks(98,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 1.0000, v0, t) * 0.8
    +     sfx.sequence.part(0.1000, 0.9000, v1, t) * 0.7
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
