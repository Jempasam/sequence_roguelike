declare name "sizzle";
declare description "a voice shared by the halts: sfx.fire.sizzle(u)*sfx.env.decay(3,u)*sfx.env.attack(.05,u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.fire.sizzle(t)*sfx.env.decay(3,t)*sfx.env.attack(.05,t);

process(t) = sound(t);
