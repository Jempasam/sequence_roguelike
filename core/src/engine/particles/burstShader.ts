import { Shader } from "../gpu"
import type { Gpu } from "../gpu"
import { DRAG_EPSILON } from "./particleMath"

/**
 * The vertex stage of a burst: each vertex holds the start of its particle, and the stage computes where
 * the particle is `uAge` seconds later, as `motionAt` does. The four vertices of a quad share their
 * particle, and tell their corner apart by `aData.w`.
 *
 * The color goes from the start to the end as a {@link ParticleSystem} does it: in straight alpha, the
 * premultiplied bytes of `aColor` being divided back first, then premultiplied again for the blend.
 */
const VERTEX = `
uniform float uAge;
uniform vec2 uGravity;
uniform float uDrag;
uniform vec2 uSize;
uniform vec4 uColorEnd;
uniform vec3 uTurn;
uniform float uAspect;

void main(){
    vec2 v0 = aData.xy;
    float life = aData.z;
    float t = uAge;
    vec2 p;
    vec2 v;
    if(uDrag > ${DRAG_EPSILON.toFixed(4)}){
        vec2 rest = uGravity / uDrag;
        float decay = exp(-uDrag * t);
        v = (v0 - rest) * decay + rest;
        p = aPosition.xy + rest * t + (v0 - rest) * ((1.0 - decay) / uDrag);
    }
    else {
        v = v0 + uGravity * t;
        p = aPosition.xy + v0 * t + 0.5 * uGravity * t * t;
    }
    float share = clamp(t / life, 0.0, 1.0);
    float alive = t < life ? 1.0 : 0.0;
    float size = mix(uSize.x, uSize.y, share) * alive;
    vec2 corner = vec2(
        (aData.w < 0.5 || aData.w > 2.5) ? -1.0 : 1.0,
        aData.w < 1.5 ? -1.0 : 1.0
    ) * (0.5 * size) * vec2(1.0, uAspect);
    vec2 direction = vec2(1.0, 0.0);
    if(uTurn.z > 0.5){
        float speed = length(v);
        if(speed > 0.000001) direction = v / speed;
    }
    else {
        float angle = uTurn.x + uTurn.y * t;
        direction = vec2(cos(angle), sin(angle));
    }
    vec2 turned = vec2(
        corner.x * direction.x - corner.y * direction.y,
        corner.x * direction.y + corner.y * direction.x
    );
    gl_Position = uViewProjection * (uModel * vec4(p + turned, aPosition.z, 1.0));
    vUV = aUV / uTextureSize;
    vec4 start = vec4(aColor.rgb / max(aColor.a, 0.0001), aColor.a);
    vec4 color = mix(start, uColorEnd, share);
    vColor = vec4(color.rgb * color.a, color.a);
    vData = aData;
    gl_PointSize = uPointSize;
}
`

const shaders = new WeakMap<Gpu, Shader>()

/** The shader of the bursts of a GPU, made on the first call and shared by every burst after it. */
export function burstShaderOf(gpu: Gpu): Shader {
    let shader = shaders.get(gpu)
    if(shader === undefined || shader.disposed){
        shader = new Shader(gpu, {
            fragment: "vec4 shade(vec2 uv, vec4 data){ return texture2D(uTexture, uv); }",
            vertex: VERTEX,
            layout: "floats",
        })
        shaders.set(gpu, shader)
    }
    return shader
}
