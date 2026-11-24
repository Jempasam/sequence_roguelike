export default effects;
/** @type { {[name:string]:function(Picture,...any|undefined):Picture} } */
declare const effects: {
    [name: string]: (arg0: Picture, ...args: (any | undefined)[]) => Picture;
};
import { Picture } from "./Picture.js";
