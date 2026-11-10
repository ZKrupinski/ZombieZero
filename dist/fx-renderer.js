'use strict';
// FX-only transparent source; no scene pixels enter the bloom shader.
class FXRenderer {
  constructor(width, height) {
    this.width=width; this.height=height;
    this.source=document.createElement('canvas');
    this.source.width=width; this.source.height=height;
    this.ctx=this.source.getContext('2d');
    this.output=document.createElement('canvas');
    this.output.width=Math.ceil(width/2); this.output.height=Math.ceil(height/2);
    this.settings={add:.6,bloom:1,radius:12};
    this.output.addEventListener('webglcontextlost',e=>{e.preventDefault();this.gl=null});
    this.output.addEventListener('webglcontextrestored',()=>this.init());
    this.init();
  }
  init() {
    try {
      const gl=this.output.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,preserveDrawingBuffer:true});
      if(!gl){this.reason='WebGL unavailable';return;}
      const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
      const vs=shader(gl.VERTEX_SHADER,'attribute vec2 p; varying vec2 uv; void main(){uv=(p+1.0)*0.5;gl_Position=vec4(p,0.,1.);}');
      const fs=shader(gl.FRAGMENT_SHADER,`precision mediump float; varying vec2 uv; uniform sampler2D source; uniform vec2 stepSize;
      void main(){vec4 c=texture2D(source,uv)*0.227027;
      c+=(texture2D(source,uv+stepSize*1.384615)+texture2D(source,uv-stepSize*1.384615))*0.316216;
      c+=(texture2D(source,uv+stepSize*3.230769)+texture2D(source,uv-stepSize*3.230769))*0.070270;
      gl_FragColor=c;}`);
      const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('FX shader link');
      gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
      const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
      this.step=gl.getUniformLocation(program,'stepSize');gl.uniform1i(gl.getUniformLocation(program,'source'),0);
      this.textures=[];this.targets=[];
      for(let i=0;i<2;i++) {const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,this.output.width,this.output.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);this.textures.push(tex);
        if(i>0){const fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('FX framebuffer');this.targets.push(fb)}
      }
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);this.gl=gl;
    } catch(error) {this.reason=String(error);this.gl=null}
  }
  begin(){this.dirty=false;this.ctx.setTransform(1,0,0,1,0,0);this.ctx.clearRect(0,0,this.width,this.height)}
  capture(target,draw){
    this.dirty=true;const t=target.getTransform(),sx=target.canvas.width/this.width,sy=target.canvas.height/this.height;
    this.ctx.save();this.ctx.setTransform(t.a/sx,t.b/sy,t.c/sx,t.d/sy,t.e/sx,t.f/sy);this.ctx.globalAlpha=target.globalAlpha;
    try{draw(this.ctx)}finally{this.ctx.restore()}
  }
  composite(target){
    if(!this.dirty)return;
    target.save();target.setTransform(target.canvas.width/this.width,0,0,target.canvas.height/this.height,0,0);target.globalCompositeOperation='lighter';target.globalAlpha=this.settings.add;target.drawImage(this.source,0,0);
    const gl=this.gl;
    if(gl&&!gl.isContextLost()){
      try {
        gl.bindTexture(gl.TEXTURE_2D,this.textures[0]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.source);
        gl.viewport(0,0,this.output.width,this.output.height);
        const pass=(input,fb,x,y)=>{gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.bindTexture(gl.TEXTURE_2D,input);gl.uniform2f(this.step,x,y);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)};
        for(const [radius,gain] of [[this.settings.radius,.65],[this.settings.radius*2,.75]]){
          pass(this.textures[0],this.targets[0],radius/3.23/this.width,0);
          pass(this.textures[1],null,0,radius/3.23/this.height);
          target.globalAlpha=this.settings.bloom*gain;target.drawImage(this.output,0,0,this.width,this.height);
        }
      }catch{this.gl=null;this.fallback(target)}
    }else this.fallback(target);
    target.restore();
  }
  fallback(target){target.globalAlpha=.65*this.settings.bloom;target.filter='blur(12px)';target.drawImage(this.source,0,0);target.filter='none'}
}
window.FXRenderer=FXRenderer;
