/**
 * RAAVE'S EVERGREEN - Ultra-Clear High-Performance Rendering Engine
 *
 * The source frames are 1280x720 JPEGs with baked-in compression artifacts, so
 * the quality work happens on the GPU rather than in the asset pipeline:
 *   - Sub-frame interpolation: two frames are cross-faded by the fractional
 *     scrub position, so 250 discrete stills read as continuous motion.
 *   - Unsharp mask: restores the edge bite lost to JPEG + upscaling.
 *   - Tone grade: gentle S-curve contrast and saturation lift.
 *   - Animated dither/grain: masks JPEG blocking and gradient banding in the
 *     large dark-green backdrop, which is where the artifacts are most visible.
 *
 * Upright orientation, exact 16:9 aspect ratio & seamless forest backdrop.
 */

const FRAME_W = 1280;
const FRAME_H = 720;
const NARROW_WIDTH_FACTOR = 2.1;

export class Renderer4K {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ mode?: 'webgl' | '2d' }} [options]
   *   '2d' skips WebGL entirely: drawImage lets the browser decode and draw on its
   *   GPU/raster threads, whereas texImage2D copies every new frame into a WebGL
   *   texture on the main thread (~8 ms per 1280x720 frame on integrated GPUs).
   */
  constructor(canvas, { mode = 'webgl' } = {}) {
    this.canvas = canvas;
    this.mode = mode;
    this.gl = null;
    this.program = null;
    this.positionBuffer = null;
    this.texCoordBuffer = null;
    this.isWebGL = false;
    this.uniforms = {};

    // Two texture slots + the frame currently resident in each, so scrubbing
    // forward costs at most one texture upload instead of two.
    this.texA = null;
    this.texB = null;
    this.keyA = null;
    this.keyB = null;

    // Redraw gating: the quad is only re-rendered when something actually moved
    this.lastA = null;
    this.lastB = null;
    this.lastBlend = -1;
    this.lastW = 0;
    this.lastH = 0;

    // Grade controls (tweakable from the outside)
    this.sharpen = 0.45;
    this.grain = 0.028;
    this.saturation = 1.1;
    this.contrast = 0.18;
    this.vignette = 0.26;

    this.init();
  }

  init() {
    const glOpts = {
      alpha: false,
      depth: false,
      stencil: false,
      // A single full-screen quad has no geometry edges, so MSAA only costs fill-rate
      antialias: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false
    };

    this.gl = this.mode === '2d'
      ? null
      : this.canvas.getContext('webgl2', glOpts) ||
        this.canvas.getContext('webgl', glOpts) ||
        this.canvas.getContext('experimental-webgl', glOpts);

    if (this.gl) {
      this.isWebGL = true;
      this.setupShaders();
      this.setupBuffers();
      this.setupTextures();
    } else {
      this.ctx2d = this.canvas.getContext('2d', { alpha: false });
    }
  }

  setupShaders() {
    const gl = this.gl;

    const vsSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    const fsSource = `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      #else
      precision mediump float;
      #endif
      uniform sampler2D u_imageA;
      uniform sampler2D u_imageB;
      uniform float u_blend;
      uniform vec2 u_scale;
      uniform vec2 u_offset;
      uniform vec2 u_texel;
      uniform float u_sharpen;
      uniform float u_grain;
      uniform float u_seed;
      uniform float u_sat;
      uniform float u_contrast;
      uniform float u_vignette;
      varying vec2 v_texCoord;

      // Sub-frame interpolation: the scrub position lands between two stills
      vec3 sampleFrame(vec2 uv) {
        vec3 a = texture2D(u_imageA, uv).rgb;
        vec3 b = texture2D(u_imageB, uv).rgb;
        return mix(a, b, u_blend);
      }

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        // Map canvas UV to frame UV taking into account scale and center offset
        vec2 uv = (v_texCoord - vec2(0.5) + u_offset) / u_scale + vec2(0.5);
        vec3 bgColor = vec3(0.024, 0.086, 0.047); // Exact deep evergreen tone (#06160c)

        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
          gl_FragColor = vec4(bgColor, 1.0);
          return;
        }

        // Frames are uploaded un-flipped (ImageBitmap uploads ignore UNPACK_FLIP_Y),
        // so flip here: image row 0 is the top of the picture.
        uv.y = 1.0 - uv.y;

        vec3 c = sampleFrame(uv);

        // Unsharp mask against the four diagonal neighbours: puts the bite back
        // into needles, star points and bauble rims after the 720p upscale
        vec2 o = u_texel;
        vec3 blur = (
            sampleFrame(uv + vec2(-o.x, -o.y))
          + sampleFrame(uv + vec2( o.x, -o.y))
          + sampleFrame(uv + vec2(-o.x,  o.y))
          + sampleFrame(uv + vec2( o.x,  o.y))
        ) * 0.25;
        vec3 col = clamp(c + (c - blur) * u_sharpen, 0.0, 1.0);

        // Gentle S-curve contrast, then saturation lift for the gold/ruby decor
        col = mix(col, col * col * (3.0 - 2.0 * col), u_contrast);
        float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = clamp(mix(vec3(lum), col, u_sat), 0.0, 1.0);

        // Dither/grain, weighted toward the shadows where JPEG blocking and
        // banding actually live in this footage
        float n = hash(gl_FragCoord.xy + vec2(u_seed, u_seed * 1.7)) - 0.5;
        col += n * u_grain * (1.0 - lum * 0.75);

        // Soft edge feather (1.5%) so any boundary seamlessly blends into background
        float edgeX = smoothstep(0.0, 0.015, uv.x) * (1.0 - smoothstep(0.985, 1.0, uv.x));
        float edgeY = smoothstep(0.0, 0.015, uv.y) * (1.0 - smoothstep(0.985, 1.0, uv.y));
        float edgeAlpha = clamp(edgeX * edgeY, 0.0, 1.0);

        // Subtle vignette seats the tree inside the frame
        vec2 vc = v_texCoord - vec2(0.5);
        float vig = 1.0 - dot(vc, vc) * u_vignette;

        gl_FragColor = vec4(mix(bgColor, clamp(col, 0.0, 1.0) * vig, edgeAlpha), 1.0);
      }
    `;

    const vs = this.createShader(gl.VERTEX_SHADER, vsSource);
    const fs = this.createShader(gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader link failed:', gl.getProgramInfoLog(program));
      return;
    }

    this.program = program;
    gl.useProgram(program);

    this.uniforms = {
      imageA: gl.getUniformLocation(program, 'u_imageA'),
      imageB: gl.getUniformLocation(program, 'u_imageB'),
      blend: gl.getUniformLocation(program, 'u_blend'),
      scale: gl.getUniformLocation(program, 'u_scale'),
      offset: gl.getUniformLocation(program, 'u_offset'),
      texel: gl.getUniformLocation(program, 'u_texel'),
      sharpen: gl.getUniformLocation(program, 'u_sharpen'),
      grain: gl.getUniformLocation(program, 'u_grain'),
      seed: gl.getUniformLocation(program, 'u_seed'),
      sat: gl.getUniformLocation(program, 'u_sat'),
      contrast: gl.getUniformLocation(program, 'u_contrast'),
      vignette: gl.getUniformLocation(program, 'u_vignette')
    };
  }

  createShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  setupBuffers() {
    const gl = this.gl;

    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]), gl.STATIC_DRAW);

    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      0, 1,
      1, 0,
      1, 1
    ]), gl.STATIC_DRAW);
  }

  createTexture() {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
  }

  setupTextures() {
    const gl = this.gl;
    // Orientation is handled in the fragment shader, so uploads behave identically
    // for <img> and ImageBitmap sources.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    this.texA = this.createTexture();
    this.texB = this.createTexture();
  }

  uploadTexture(tex, image) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  }

  /** Force the next render() call to redraw even if its inputs are unchanged. */
  invalidate() {
    this.lastA = null;
    this.lastB = null;
    this.lastBlend = -1;
  }

  calculateAspect(viewMode, screenW, screenH, frameW = FRAME_W, frameH = FRAME_H) {
    const frameRatio = frameW / frameH; // 16:9 = 1.777778
    const screenRatio = screenW / screenH;

    let dw, dh, offsetY;

    if (screenRatio >= frameRatio) {
      // Widescreen displays (desktop, laptop):
      // Height fits inside the screen with room for the 72px navigation header
      const headerRatio = 72 / (window.innerHeight || 800);
      const headerCanvasFrac = Math.min(0.12, headerRatio);

      dh = screenH * (1.0 - headerCanvasFrac * 0.35);
      dw = dh * frameRatio;

      // Positive offset shifts image downward so the star sits comfortably below the header
      offsetY = headerCanvasFrac * 0.28;
    } else {
      // Narrow screens (phones, tablet portrait): the tree occupies roughly the
      // middle third of the 16:9 frame, so size the frame to about twice the screen
      // width. Filling the full height instead crops the tree to a close-up.
      dw = Math.min(screenW * NARROW_WIDTH_FACTOR, screenH * frameRatio);
      dh = dw / frameRatio;
      offsetY = 0;
    }

    const scaleX = dw / screenW;
    const scaleY = dh / screenH;

    return { scaleX, scaleY, offsetX: 0, offsetY };
  }

  /**
   * @param {HTMLImageElement} frameA  the still at floor(position)
   * @param {HTMLImageElement} frameB  the still at floor(position) + 1
   * @param {number} blend             fractional part of the scrub position (0..1)
   */
  render(frameA, frameB, blend = 0, viewMode = 'contain') {
    if (!frameA) return;

    const b = frameB || frameA;
    // Quantise the blend so micro-drift in the eased scrub does not force a
    // full-screen redraw on every single animation frame
    const qBlend = frameB ? Math.round(Math.max(0, Math.min(1, blend)) * 64) / 64 : 0;

    const cw = this.canvas.width;
    const ch = this.canvas.height;

    if (
      this.lastA === frameA &&
      this.lastB === b &&
      this.lastBlend === qBlend &&
      this.lastW === cw &&
      this.lastH === ch
    ) {
      return;
    }

    this.lastA = frameA;
    this.lastB = b;
    this.lastBlend = qBlend;
    this.lastW = cw;
    this.lastH = ch;

    if (this.isWebGL && this.gl && this.program) {
      const gl = this.gl;

      // A neighbouring step reuses one of the two resident textures, so swap the
      // handles instead of re-uploading (and re-decoding) the same JPEG.
      // Forward: old B becomes new A. Backward: old A becomes new B.
      if (this.keyA !== frameA && (this.keyB === frameA || this.keyA === b)) {
        const t = this.texA;
        this.texA = this.texB;
        this.texB = t;
        const k = this.keyA;
        this.keyA = this.keyB;
        this.keyB = k;
      }
      if (this.keyA !== frameA) {
        this.uploadTexture(this.texA, frameA);
        this.keyA = frameA;
      }
      if (this.keyB !== b) {
        this.uploadTexture(this.texB, b);
        this.keyB = b;
      }

      gl.viewport(0, 0, cw, ch);
      gl.clearColor(0.024, 0.086, 0.047, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(this.program);

      const aspect = this.calculateAspect(viewMode, cw, ch, FRAME_W, FRAME_H);

      const posAttr = gl.getAttribLocation(this.program, 'a_position');
      gl.enableVertexAttribArray(posAttr);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

      const texAttr = gl.getAttribLocation(this.program, 'a_texCoord');
      gl.enableVertexAttribArray(texAttr);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
      gl.vertexAttribPointer(texAttr, 2, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texA);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.texB);

      gl.uniform1i(this.uniforms.imageA, 0);
      gl.uniform1i(this.uniforms.imageB, 1);
      gl.uniform1f(this.uniforms.blend, qBlend);
      gl.uniform2f(this.uniforms.scale, aspect.scaleX, aspect.scaleY);
      gl.uniform2f(this.uniforms.offset, aspect.offsetX, aspect.offsetY);
      gl.uniform2f(this.uniforms.texel, 0.9 / FRAME_W, 0.9 / FRAME_H);
      gl.uniform1f(this.uniforms.sharpen, this.sharpen);
      gl.uniform1f(this.uniforms.grain, this.grain);
      // Seeded off the scrub position: grain re-rolls as the tree animates but
      // stays perfectly still when the user stops scrolling
      gl.uniform1f(this.uniforms.seed, (this.frameSeed || 0) * 0.618 % 1.0 * 100.0);
      gl.uniform1f(this.uniforms.sat, this.saturation);
      gl.uniform1f(this.uniforms.contrast, this.contrast);
      gl.uniform1f(this.uniforms.vignette, this.vignette);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else if (this.ctx2d) {
      const ctx = this.ctx2d;
      const frameRatio = FRAME_W / FRAME_H;
      const screenRatio = cw / ch;

      let dw, dh, dy;
      if (screenRatio >= frameRatio) {
        const headerRatio = 72 / (window.innerHeight || 800);
        const headerCanvasFrac = Math.min(0.12, headerRatio);
        dh = ch * (1.0 - headerCanvasFrac * 0.35);
        dw = dh * frameRatio;
        dy = (ch - dh) / 2 + (ch * headerCanvasFrac * 0.28);
      } else {
        dw = Math.min(cw * NARROW_WIDTH_FACTOR, ch * frameRatio);
        dh = dw / frameRatio;
        dy = (ch - dh) / 2;
      }
      const dx = (cw - dw) / 2;

      ctx.fillStyle = '#06160c';
      ctx.fillRect(0, 0, cw, ch);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.globalAlpha = 1;
      // Whole-source draws: frames may arrive downscaled (ImageBitmap resize)
      ctx.drawImage(frameA, dx, dy, dw, dh);
      if (qBlend > 0.01) {
        ctx.globalAlpha = qBlend;
        ctx.drawImage(b, dx, dy, dw, dh);
        ctx.globalAlpha = 1;
      }

      // Feather the frame's side edges into the backdrop (the WebGL shader did this),
      // so a frame narrower than the screen shows no hard seam.
      const feather = dw * 0.04;
      if (dx > 0) {
        const left = ctx.createLinearGradient(dx, 0, dx + feather, 0);
        left.addColorStop(0, '#06160c');
        left.addColorStop(1, 'rgba(6, 22, 12, 0)');
        ctx.fillStyle = left;
        ctx.fillRect(dx, dy, feather, dh);

        const right = ctx.createLinearGradient(dx + dw, 0, dx + dw - feather, 0);
        right.addColorStop(0, '#06160c');
        right.addColorStop(1, 'rgba(6, 22, 12, 0)');
        ctx.fillStyle = right;
        ctx.fillRect(dx + dw - feather, dy, feather, dh);
      }
    }
  }
}
