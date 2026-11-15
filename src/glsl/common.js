// Shared GLSL: hashing, noise, colour helpers.
export const GLSL_COMMON = /* glsl */`
#ifndef OA_COMMON
#define OA_COMMON
#define PI 3.14159265359
#define TAU 6.28318530718

float saturate(float x){ return clamp(x, 0.0, 1.0); }
vec3 saturate(vec3 x){ return clamp(x, 0.0, 1.0); }

// --- hashes (integer based, stable across GPUs) ---
uint pcg(uint v){ uint state = v * 747796405u + 2891336453u; uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u; return (word >> 22u) ^ word; }
uvec2 pcg2(uvec2 v){ v = v * 1664525u + 1013904223u; v.x += v.y * 1664525u; v.y += v.x * 1664525u; v = v ^ (v >> 16u); v.x += v.y * 1664525u; v.y += v.x * 1664525u; v = v ^ (v >> 16u); return v; }
uvec3 pcg3(uvec3 v){ v = v * 1664525u + 1013904223u; v.x += v.y*v.z; v.y += v.z*v.x; v.z += v.x*v.y; v ^= v >> 16u; v.x += v.y*v.z; v.y += v.z*v.x; v.z += v.x*v.y; return v; }
float h11(float p){ return float(pcg(uint(int(floor(p)) + 65536))) / 4294967295.0; }
vec2 h22(vec2 p){ uvec2 q = pcg2(uvec2(ivec2(floor(p)) + ivec2(32768))); return vec2(q) / 4294967295.0; }
float h21(vec2 p){ return h22(p).x; }
vec3 h33(vec3 p){ uvec3 q = pcg3(uvec3(ivec3(floor(p)) + ivec3(32768))); return vec3(q) / 4294967295.0; }
vec4 h24(vec2 p, float s){ uvec3 q = pcg3(uvec3(ivec3(ivec2(floor(p)) + ivec2(32768), int(s)))); uvec3 r = pcg3(q.zxy + 17u); return vec4(vec2(q.xy), float(r.x), float(r.y)) / 4294967295.0; }

// --- value / gradient noise ---
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
float vnoise3(vec3 p){ vec3 i = floor(p), f = fract(p); vec3 u = f*f*(3.0-2.0*f);
  float a = h33(i).x, b = h33(i+vec3(1,0,0)).x, c = h33(i+vec3(0,1,0)).x, d = h33(i+vec3(1,1,0)).x;
  float e = h33(i+vec3(0,0,1)).x, f1 = h33(i+vec3(1,0,1)).x, g = h33(i+vec3(0,1,1)).x, h = h33(i+vec3(1,1,1)).x;
  return mix(mix(mix(a,b,u.x), mix(c,d,u.x), u.y), mix(mix(e,f1,u.x), mix(g,h,u.x), u.y), u.z); }
vec2 grad2(vec2 i){ float a = h21(i) * TAU; return vec2(cos(a), sin(a)); }
float gnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
  float a = dot(grad2(i), f), b = dot(grad2(i+vec2(1,0)), f-vec2(1,0));
  float c = dot(grad2(i+vec2(0,1)), f-vec2(0,1)), d = dot(grad2(i+vec2(1,1)), f-vec2(1,1));
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y) * 1.4142; } // ~[-1,1]
float fbm(vec2 p){ float s = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 5; i++){ s += a * gnoise(p); p = m * p; a *= 0.5; } return s; }
float fbm3(vec2 p){ float s = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 3; i++){ s += a * gnoise(p); p = m * p; a *= 0.5; } return s; }
float fbmv3(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * vnoise3(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }

// --- colour ---
vec3 srgb2lin(vec3 c){ return pow(c, vec3(2.2)); }
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 toOklab(vec3 c){
  float l = 0.4122214708*c.r + 0.5363325363*c.g + 0.0514459929*c.b;
  float m = 0.2119034982*c.r + 0.6806995451*c.g + 0.1073969566*c.b;
  float s = 0.0883024619*c.r + 0.2817188376*c.g + 0.6299787005*c.b;
  l = pow(max(l,0.0), 1.0/3.0); m = pow(max(m,0.0), 1.0/3.0); s = pow(max(s,0.0), 1.0/3.0);
  return vec3(0.2104542553*l + 0.7936177850*m - 0.0040720468*s,
              1.9779984951*l - 2.4285922050*m + 0.4505937099*s,
              0.0259040371*l + 0.7827717662*m - 0.8086757660*s); }
vec3 fromOklab(vec3 c){
  float l = c.x + 0.3963377774*c.y + 0.2158037573*c.z;
  float m = c.x - 0.1055613458*c.y - 0.0638541728*c.z;
  float s = c.x - 0.0894841775*c.y - 1.2914855480*c.z;
  l = l*l*l; m = m*m*m; s = s*s*s;
  return vec3(4.0767416621*l - 3.3077115913*m + 0.2309699292*s,
             -1.2684380046*l + 2.6097574011*m - 0.3413193965*s,
             -0.0041960863*l - 0.7034186147*m + 1.7076147010*s); }
vec3 satAdjust(vec3 c, float s){ float l = luma(c); return max(vec3(0.0), mix(vec3(l), c, s)); }
mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
#endif
`;
