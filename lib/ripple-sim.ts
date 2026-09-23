/**
 * 바닐라 WebGL 높이장(height field) 물결 시뮬레이션.
 * jquery.ripples 와 같은 방식(핑퐁 프레임버퍼 두 개로 파동 방정식을 갱신하고,
 * 기울기로 음영을 계산해 오버레이로 그린다)을 직접 구현한 것으로, jQuery 의존이 없다.
 *
 * 배경 이미지를 굴절시키지 않는다 — 표시 패스는 높이장의 기울기만으로
 * 하이라이트(흰색 계열)·그림자(아주 옅은 청색) 알파를 계산해 투명 배경 위에 그린다.
 * 다크 모드(`html.dark`)에서는 하이라이트를 더 강하게 낸다.
 *
 * float 렌더 타깃을 실제로 쓸 수 없는 환경(대부분의 구형 모바일 GPU)에서는
 * createRippleSim 이 null 을 반환한다 — 호출부는 아무것도 그리지 않아야 한다.
 */

// 조정용 상수
const SIM_MAX_WIDTH = 256; // 시뮬레이션 해상도(가로 텍셀 수) — 올리면 세밀해지지만 갱신 비용이 커진다
const SIM_MIN_DIM = 48; // 가로/세로 어느 쪽도 이보다 작아지지 않는다
const DAMPING = 0.985; // 프레임당 감쇠율 — 1에 가까울수록 물결이 오래 남는다
const DROP_RADIUS = 0.05; // 드롭 반경 (정규화 uv, 가로 기준)
const SHADE_INTENSITY = 5.5; // 높이 기울기 → 알파 변환 배율
const HIGHLIGHT_COLOR: [number, number, number] = [1, 1, 1]; // 하이라이트: 흰색 계열
const SHADOW_COLOR: [number, number, number] = [0.65, 0.78, 0.95]; // 그림자: 아주 옅은 청색 — 어둡게 하지 않고 살짝 식힌다
const HIGHLIGHT_MAX_ALPHA_LIGHT = 0.3; // 라이트 모드 하이라이트 알파 상한
const HIGHLIGHT_MAX_ALPHA_DARK = 0.62; // 다크 모드는 배경이 어두워 하이라이트를 더 강하게 둔다
const HIGHLIGHT_SCALE_DARK = 1.8; // 다크 모드에서 기울기 → 하이라이트 반응 배율
const SHADOW_MAX_ALPHA = 0.08; // 그림자 알파 상한 — 낮게 유지해 회색 얼룩을 막는다

const VERTEX_SHADER_SOURCE = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const UPDATE_FRAGMENT_SHADER_SOURCE = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform float uDamping;
void main() {
  vec4 state = texture2D(uState, vUv);
  float height = state.r;
  float velocity = state.g;
  float neighborAvg = (
    texture2D(uState, vUv + vec2(uTexel.x, 0.0)).r +
    texture2D(uState, vUv - vec2(uTexel.x, 0.0)).r +
    texture2D(uState, vUv + vec2(0.0, uTexel.y)).r +
    texture2D(uState, vUv - vec2(0.0, uTexel.y)).r
  ) * 0.25;
  velocity += (neighborAvg - height) * 2.0;
  velocity *= uDamping;
  height += velocity;
  gl_FragColor = vec4(height, velocity, 0.0, 1.0);
}
`;

const DROP_FRAGMENT_SHADER_SOURCE = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uState;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uStrength;
uniform float uAspect;
void main() {
  vec4 state = texture2D(uState, vUv);
  vec2 delta = vUv - uCenter;
  delta.y *= uAspect;
  float dist = length(delta);
  float falloff = 1.0 - smoothstep(0.0, uRadius, dist);
  state.r += falloff * uStrength;
  gl_FragColor = state;
}
`;

/**
 * 표시 패스는 두 변형으로 컴파일된다 — `OES_texture_*_linear` 를 실제로 쓸 수 있으면
 * 하드웨어 LINEAR 필터로 텍스처를 그대로 읽고(HARDWARE_FILTER_SAMPLE), 없으면
 * `sampleHeight` 를 수동 쌍선형 보간으로 바꿔 저해상도 텍스처를 올려 그릴 때
 * 생기는 계단 현상(블록 픽셀)을 막는다. 시뮬레이션 해상도 자체는 올리지 않는다.
 */
const DISPLAY_FRAGMENT_SHADER_HEAD = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform vec3 uHighlightColor;
uniform vec3 uShadowColor;
uniform float uIntensity;
uniform float uHighlightMaxAlpha;
uniform float uShadowMaxAlpha;
uniform float uHighlightScale;
`;

const HARDWARE_FILTER_SAMPLE = `
float sampleHeight(vec2 uv) {
  return texture2D(uState, uv).r;
}
`;

const MANUAL_BILINEAR_SAMPLE = `
float sampleHeight(vec2 uv) {
  vec2 texCoord = uv / uTexel - 0.5;
  vec2 f = fract(texCoord);
  vec2 base = (floor(texCoord) + 0.5) * uTexel;
  float h00 = texture2D(uState, base).r;
  float h10 = texture2D(uState, base + vec2(uTexel.x, 0.0)).r;
  float h01 = texture2D(uState, base + vec2(0.0, uTexel.y)).r;
  float h11 = texture2D(uState, base + uTexel).r;
  return mix(mix(h00, h10, f.x), mix(h01, h11, f.x), f.y);
}
`;

const DISPLAY_FRAGMENT_SHADER_BODY = `
void main() {
  float left = sampleHeight(vUv - vec2(uTexel.x, 0.0));
  float right = sampleHeight(vUv + vec2(uTexel.x, 0.0));
  float up = sampleHeight(vUv - vec2(0.0, uTexel.y));
  float down = sampleHeight(vUv + vec2(0.0, uTexel.y));
  float light = (right - left) + (down - up);
  float highlightRaw = max(light, 0.0) * uIntensity * uHighlightScale;
  float shadowRaw = max(-light, 0.0) * uIntensity;
  float ha = clamp(highlightRaw, 0.0, uHighlightMaxAlpha);
  float sa = clamp(shadowRaw, 0.0, uShadowMaxAlpha);
  float alpha = clamp(ha + sa, 0.0, 1.0);
  vec3 color = alpha > 0.0001 ? (uHighlightColor * ha + uShadowColor * sa) / alpha : vec3(0.0);
  gl_FragColor = vec4(color, alpha);
}
`;

function buildDisplayShaderSource(useManualBilinear: boolean): string {
  return DISPLAY_FRAGMENT_SHADER_HEAD + (useManualBilinear ? MANUAL_BILINEAR_SAMPLE : HARDWARE_FILTER_SAMPLE) + DISPLAY_FRAGMENT_SHADER_BODY;
}

export interface RippleSim {
  /** u,v 는 0..1 정규화 좌표. strength 는 양수(솟음)/음수(패임) 높이 변화량 */
  addDrop(u: number, v: number, strength: number): void;
  /** 시뮬레이션을 한 스텝 갱신하고 캔버스에 렌더링한다 */
  step(): void;
  /** 캔버스의 실제 픽셀 크기(디바이스 픽셀 포함)가 바뀌었을 때 호출 */
  resizeSim(pixelWidth: number, pixelHeight: number): void;
  /** 이 사이트의 다크 판정(`html.dark`)이 바뀔 때마다 호출 — 다크에서 하이라이트를 더 강하게 낸다 */
  setDarkMode(isDark: boolean): void;
  /** GL 자원을 해제한다 */
  destroy(): void;
}

type FloatTextureSupport = { type: number; halfFloat: boolean };

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/** float 또는 half-float 텍스처를 실제로 렌더 타깃으로 쓸 수 있는지 확인한다 */
function pickRenderableFloatType(gl: WebGLRenderingContext): FloatTextureSupport | null {
  const candidates: Array<{ extName: string; halfFloat: boolean }> = [
    { extName: "OES_texture_half_float", halfFloat: true },
    { extName: "OES_texture_float", halfFloat: false },
  ];

  for (const candidate of candidates) {
    const ext = gl.getExtension(candidate.extName);
    if (!ext) continue;
    const type = candidate.halfFloat
      ? (ext as { HALF_FLOAT_OES: number }).HALF_FLOAT_OES
      : gl.FLOAT;

    const texture = gl.createTexture();
    const framebuffer = gl.createFramebuffer();
    if (!texture || !framebuffer) continue;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, 4, 0, gl.RGBA, type, null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(framebuffer);
    gl.deleteTexture(texture);

    if (status === gl.FRAMEBUFFER_COMPLETE) {
      return { type, halfFloat: candidate.halfFloat };
    }
  }
  return null;
}

/** `OES_texture_{float,half_float}_linear` 를 실제로 쓸 수 있는지 — 있으면 하드웨어 LINEAR 필터를 쓴다 */
function supportsLinearFiltering(gl: WebGLRenderingContext, halfFloat: boolean): boolean {
  const name = halfFloat ? "OES_texture_half_float_linear" : "OES_texture_float_linear";
  return !!gl.getExtension(name);
}

interface StateTarget {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
}

function createStateTarget(
  gl: WebGLRenderingContext,
  width: number,
  height: number,
  type: number,
  filter: number
): StateTarget | null {
  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  if (!texture || !framebuffer) return null;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, type, null);

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!complete) {
    gl.deleteFramebuffer(framebuffer);
    gl.deleteTexture(texture);
    return null;
  }
  return { texture, framebuffer };
}

export function createRippleSim(canvas: HTMLCanvasElement): RippleSim | null {
  const glOrNull = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
  }) as WebGLRenderingContext | null;
  if (!glOrNull) return null;
  // 아래 중첩 함수들이 캡처하므로, TS 흐름 분석이 유지되도록 non-null 타입으로 재바인딩한다
  const gl: WebGLRenderingContext = glOrNull;

  const floatSupportOrNull = pickRenderableFloatType(gl);
  if (!floatSupportOrNull) return null;
  const floatSupport: FloatTextureSupport = floatSupportOrNull;

  const useHardwareLinear = supportsLinearFiltering(gl, floatSupport.halfFloat);
  const stateFilter = useHardwareLinear ? gl.LINEAR : gl.NEAREST;

  const updateProgramOrNull = createProgram(gl, VERTEX_SHADER_SOURCE, UPDATE_FRAGMENT_SHADER_SOURCE);
  const dropProgramOrNull = createProgram(gl, VERTEX_SHADER_SOURCE, DROP_FRAGMENT_SHADER_SOURCE);
  const displayProgramOrNull = createProgram(gl, VERTEX_SHADER_SOURCE, buildDisplayShaderSource(!useHardwareLinear));
  if (!updateProgramOrNull || !dropProgramOrNull || !displayProgramOrNull) return null;
  const updateProgram: WebGLProgram = updateProgramOrNull;
  const dropProgram: WebGLProgram = dropProgramOrNull;
  const displayProgram: WebGLProgram = displayProgramOrNull;

  const quadBuffer = gl.createBuffer();
  if (!quadBuffer) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  let simWidth = SIM_MAX_WIDTH;
  let simHeight = SIM_MAX_WIDTH;
  let aspect = 1; // pixelWidth / pixelHeight
  let targetA: StateTarget | null = null;
  let targetB: StateTarget | null = null;
  let current = 0; // 0 -> targetA 가 최신 상태, 1 -> targetB

  function allocateTargets(width: number, height: number) {
    if (targetA) {
      gl.deleteTexture(targetA.texture);
      gl.deleteFramebuffer(targetA.framebuffer);
    }
    if (targetB) {
      gl.deleteTexture(targetB.texture);
      gl.deleteFramebuffer(targetB.framebuffer);
    }
    targetA = createStateTarget(gl, width, height, floatSupport.type, stateFilter);
    targetB = createStateTarget(gl, width, height, floatSupport.type, stateFilter);
    current = 0;
  }

  function computeSimSize(pixelWidth: number, pixelHeight: number) {
    const ratio = pixelWidth / Math.max(1, pixelHeight);
    let width = SIM_MAX_WIDTH;
    let height = Math.round(width / ratio);
    if (height < SIM_MIN_DIM) height = SIM_MIN_DIM;
    if (height > SIM_MAX_WIDTH) height = SIM_MAX_WIDTH;
    if (width < SIM_MIN_DIM) width = SIM_MIN_DIM;
    return { width, height };
  }

  function resizeSim(pixelWidth: number, pixelHeight: number) {
    canvas.width = Math.max(1, Math.round(pixelWidth));
    canvas.height = Math.max(1, Math.round(pixelHeight));
    aspect = pixelWidth / Math.max(1, pixelHeight);
    const size = computeSimSize(pixelWidth, pixelHeight);
    simWidth = size.width;
    simHeight = size.height;
    allocateTargets(simWidth, simHeight);
  }

  resizeSim(canvas.width || SIM_MAX_WIDTH, canvas.height || SIM_MAX_WIDTH);
  if (!targetA || !targetB) return null;

  const positionLocations = {
    update: gl.getAttribLocation(updateProgram, "aPosition"),
    drop: gl.getAttribLocation(dropProgram, "aPosition"),
    display: gl.getAttribLocation(displayProgram, "aPosition"),
  };

  function bindQuad(program: WebGLProgram, location: number) {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
  }

  function currentTarget(): StateTarget {
    return (current === 0 ? targetA : targetB) as StateTarget;
  }
  function otherTarget(): StateTarget {
    return (current === 0 ? targetB : targetA) as StateTarget;
  }

  const pendingDrops: Array<{ u: number; v: number; strength: number }> = [];
  let darkMode = false;

  function addDrop(u: number, v: number, strength: number) {
    pendingDrops.push({ u, v, strength });
  }

  function setDarkMode(isDark: boolean) {
    darkMode = isDark;
  }

  function runDropPass(u: number, v: number, strength: number) {
    const src = currentTarget();
    const dst = otherTarget();
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.framebuffer);
    gl.viewport(0, 0, simWidth, simHeight);
    bindQuad(dropProgram, positionLocations.drop);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.texture);
    gl.uniform1i(gl.getUniformLocation(dropProgram, "uState"), 0);
    gl.uniform2f(gl.getUniformLocation(dropProgram, "uCenter"), u, v);
    gl.uniform1f(gl.getUniformLocation(dropProgram, "uRadius"), DROP_RADIUS);
    gl.uniform1f(gl.getUniformLocation(dropProgram, "uStrength"), strength);
    gl.uniform1f(gl.getUniformLocation(dropProgram, "uAspect"), aspect);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    current = current === 0 ? 1 : 0;
  }

  function runUpdatePass() {
    const src = currentTarget();
    const dst = otherTarget();
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.framebuffer);
    gl.viewport(0, 0, simWidth, simHeight);
    bindQuad(updateProgram, positionLocations.update);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.texture);
    gl.uniform1i(gl.getUniformLocation(updateProgram, "uState"), 0);
    gl.uniform2f(gl.getUniformLocation(updateProgram, "uTexel"), 1 / simWidth, 1 / simHeight);
    gl.uniform1f(gl.getUniformLocation(updateProgram, "uDamping"), DAMPING);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    current = current === 0 ? 1 : 0;
  }

  function runDisplayPass() {
    const src = currentTarget();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    bindQuad(displayProgram, positionLocations.display);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.texture);
    gl.uniform1i(gl.getUniformLocation(displayProgram, "uState"), 0);
    gl.uniform2f(gl.getUniformLocation(displayProgram, "uTexel"), 1 / simWidth, 1 / simHeight);
    gl.uniform3f(gl.getUniformLocation(displayProgram, "uHighlightColor"), ...HIGHLIGHT_COLOR);
    gl.uniform3f(gl.getUniformLocation(displayProgram, "uShadowColor"), ...SHADOW_COLOR);
    gl.uniform1f(gl.getUniformLocation(displayProgram, "uIntensity"), SHADE_INTENSITY);
    gl.uniform1f(
      gl.getUniformLocation(displayProgram, "uHighlightMaxAlpha"),
      darkMode ? HIGHLIGHT_MAX_ALPHA_DARK : HIGHLIGHT_MAX_ALPHA_LIGHT
    );
    gl.uniform1f(gl.getUniformLocation(displayProgram, "uShadowMaxAlpha"), SHADOW_MAX_ALPHA);
    gl.uniform1f(gl.getUniformLocation(displayProgram, "uHighlightScale"), darkMode ? HIGHLIGHT_SCALE_DARK : 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disable(gl.BLEND);
  }

  function step() {
    while (pendingDrops.length > 0) {
      const drop = pendingDrops.shift();
      if (drop) runDropPass(drop.u, drop.v, drop.strength);
    }
    runUpdatePass();
    runDisplayPass();
  }

  function destroy() {
    gl.deleteProgram(updateProgram);
    gl.deleteProgram(dropProgram);
    gl.deleteProgram(displayProgram);
    gl.deleteBuffer(quadBuffer);
    if (targetA) {
      gl.deleteTexture(targetA.texture);
      gl.deleteFramebuffer(targetA.framebuffer);
    }
    if (targetB) {
      gl.deleteTexture(targetB.texture);
      gl.deleteFramebuffer(targetB.framebuffer);
    }
    targetA = null;
    targetB = null;
  }

  return { addDrop, step, resizeSim, setDarkMode, destroy };
}
