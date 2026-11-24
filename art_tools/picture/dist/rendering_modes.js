import { Picture } from "./Picture.js";
import pipelines from "./pipelines.js";
/**
 * The same recipes as `pipelines.js`, in the shape the editor wants: draw straight onto a 2d
 * context. Kept as a separate module so the pipelines themselves stay canvas-free.
 *
 * @type {{ [key:string]: (context: CanvasRenderingContext2D, picture: Picture, light_direction?: [number,number]) => void }}
 */
export default Object.fromEntries(Object.entries(pipelines).map(([name, pipeline]) => [name, (context, picture, light_direction) => pipeline(picture, light_direction).draw(context)]));
