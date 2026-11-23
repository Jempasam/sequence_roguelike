declare name "round_start";
declare description "a light gong marking a new round: two metallic partials ringing out";
declare duration "0.5";

import("sfx.lib");

partial(f, k, a, t) = sfx.osc.fm(f, 1.41, 1.5) * sfx.env.decay(k, t) * a;

process(t) = (partial(392, 7, 0.5, t) + partial(588, 10, 0.3, t) + partial(980, 14, 0.15, t))
    * sfx.env.attack(0.005, t) * 0.7;
