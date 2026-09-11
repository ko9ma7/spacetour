export class PanoramaViewer {
  constructor(container, src, label = '360° 공간') {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'pano-canvas';
    this.canvas.setAttribute('aria-label', label);
    this.container.replaceChildren(this.canvas);
    this.gl = this.canvas.getContext('webgl', { antialias: true, alpha: false });
    this.yaw = 0; this.pitch = 0; this.fov = 78; this.dragging = false;
    if (!this.gl) { this.fallback(src); return; }
    this.initGL(); this.bind(); this.load(src);
  }
  fallback(src) {
    const img = new Image(); img.src = src; img.alt = '360° 이미지'; img.className = 'pano-fallback'; this.container.replaceChildren(img);
  }
  initGL() {
    const gl = this.gl;
    const vs = `attribute vec2 a; varying vec2 v; void main(){v=(a+1.0)*0.5;gl_Position=vec4(a,0.,1.);}`;
    const fs = `precision mediump float; varying vec2 v; uniform sampler2D tex; uniform float yaw,pitch,fov,aspect;
      const float PI=3.14159265359;
      mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s, 0.,1.,0., s,0.,c);} 
      mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0., 0.,c,s, 0.,-s,c);} 
      void main(){vec2 p=v*2.-1.; float t=tan(fov*.5); vec3 d=normalize(vec3(p.x*t*aspect,-p.y*t,-1.)); d=ry(yaw)*rx(pitch)*d; float u=atan(d.z,d.x)/(2.*PI)+.5; float vv=acos(clamp(d.y,-1.,1.))/PI; gl_FragColor=texture2D(tex,vec2(fract(u),vv));}`;
    const compile = (type, source) => { const s=gl.createShader(type); gl.shaderSource(s,source); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const program=gl.createProgram(); gl.attachShader(program,compile(gl.VERTEX_SHADER,vs)); gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs)); gl.linkProgram(program); gl.useProgram(program); this.program=program;
    const buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(program,'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    this.u={tex:gl.getUniformLocation(program,'tex'),yaw:gl.getUniformLocation(program,'yaw'),pitch:gl.getUniformLocation(program,'pitch'),fov:gl.getUniformLocation(program,'fov'),aspect:gl.getUniformLocation(program,'aspect')};
    this.texture=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,this.texture); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  }
  load(src) { const img=new Image(); img.onload=()=>{const gl=this.gl; gl.bindTexture(gl.TEXTURE_2D,this.texture); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img); this.ready=true; this.render();}; img.onerror=()=>this.fallback(src); img.src=src; }
  bind() {
    const c=this.canvas;
    this.resize=()=>{const r=c.getBoundingClientRect(); const d=Math.min(devicePixelRatio||1,2); c.width=Math.max(2,Math.floor(r.width*d)); c.height=Math.max(2,Math.floor(r.height*d)); this.render();};
    this.ro=new ResizeObserver(this.resize); this.ro.observe(c);
    c.addEventListener('pointerdown',e=>{this.dragging=true;this.px=e.clientX;this.py=e.clientY;c.setPointerCapture(e.pointerId);});
    c.addEventListener('pointermove',e=>{if(!this.dragging)return; const dx=e.clientX-this.px,dy=e.clientY-this.py;this.px=e.clientX;this.py=e.clientY;this.yaw-=dx*.005;this.pitch=Math.max(-1.25,Math.min(1.25,this.pitch-dy*.004));this.render();});
    c.addEventListener('pointerup',()=>this.dragging=false); c.addEventListener('pointercancel',()=>this.dragging=false);
    c.addEventListener('wheel',e=>{e.preventDefault();this.fov=Math.max(38,Math.min(105,this.fov+Math.sign(e.deltaY)*4));this.render();},{passive:false});
  }
  render(){if(!this.gl||!this.ready)return;const gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.uniform1f(this.u.yaw,this.yaw);gl.uniform1f(this.u.pitch,this.pitch);gl.uniform1f(this.u.fov,this.fov*Math.PI/180);gl.uniform1f(this.u.aspect,this.canvas.width/this.canvas.height);gl.drawArrays(gl.TRIANGLES,0,6);}
  destroy(){this.ro?.disconnect();this.container.replaceChildren();}
}
