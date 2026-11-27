declare name "electrocuted";
declare description "a harsh buzz stuttering with sparks";
declare duration "0.5";

import("sfx.lib");

buzz = (sfx.osc.saw(110) + sfx.osc.square(173)) * 0.5 : fi.lowpass(2, 3000);
sparks = sfx.noise.crackle(0.02) : fi.resonbp(3500, 1.2, 1);
stutter = 0.35 + 0.65 * (os.osc(28) > 0);

process(t) = (buzz * stutter * 0.4 + sparks * 0.25) * sfx.env.fadeio(0.02, 0.5, t) : fi.dcblocker;
