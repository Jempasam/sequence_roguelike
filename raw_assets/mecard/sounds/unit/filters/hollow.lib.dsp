declare name "hollow";
declare description "a sound from beyond: thinned, echoed, in a large room";

import("sfx.lib");

filter(s, t) = s(t) : sfx.filter.hpf(250, 0.7) : sfx.fx.echo(0.12, 0.35) : sfx.fx.reverb(0.85, 0.35);
