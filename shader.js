
class Shader {
	constructor(vertCode, fragCode) {
		//VERTEX SHADER
		this.vertShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(this.vertShader, vertCode);
		gl.compileShader(this.vertShader);

		//FRAGMENT SHADER
		this.fragShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(this.fragShader, fragCode);
		gl.compileShader(this.fragShader);

		//SHADER PROGRAM
		this.program = gl.createProgram();
		gl.attachShader(this.program, this.vertShader);
		gl.attachShader(this.program, this.fragShader);
		gl.linkProgram(this.program);
		gl.useProgram(this.program);

		//UNIFORMS
		this.uniforms = {};
		this.getUniforms(vertCode);
		this.getUniforms(fragCode);
	}
	getUniforms(code) {
		let regex = code.matchAll(/uniform [^;]*/g);
		while (true) {
			let it = regex.next();
			if (it.done) break;
			let uniform = it.value[0].match(/u_[^ []*/g);
			this.uniforms[uniform] = gl.getUniformLocation(this.program, uniform);
		}
	}
	bind() {
		gl.useProgram(this.program);
	}
	unbind() {
		gl.useProgram(0);
	}
};

const base_vertex_shader =
	`#version 300 es
	layout(location = 0) in vec2 a_position;
	layout(location = 1) in vec2 a_texCoord;
	uniform vec2 u_screen;
	out vec2 v_position;
	out vec2 v_texCoord;
	void main() {
		gl_Position = vec4(a_position.x/u_screen.x-1.0, a_position.y/u_screen.y-1.0, 1, 1);
		v_position = gl_Position.xy;
		v_texCoord = a_texCoord;
	}`;

const texture_shader = new Shader(
	//VERTEX SHADER CODE
	base_vertex_shader,
	//FRAGMENT SHADER CODE
	`#version 300 es
	precision mediump float;
	uniform sampler2D u_tex[2];
	in vec2 v_texCoord;
	out vec4 fragColor;
	void main() {
		vec4 bg = vec4(0.055,0.051,0.122,1);
		vec4 base = texture(u_tex[0], v_texCoord);
		vec4 bright = texture(u_tex[1], v_texCoord);
		fragColor = vec4(base.rgb*base.a + bg.rgb*(1.0-base.a), 1)+bright;
	}`
);

const blurH_shader = new Shader(
	//VERTEX SHADER CODE
	base_vertex_shader,
	//FRAGMENT SHADER CODE
	`#version 300 es
	precision mediump float;
	uniform sampler2D u_tex;
	in vec2 v_position;
	in vec2 v_texCoord;	
	out vec4 fragColor;
	void main() {
		float w[5] = float[] (0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
		vec2 pixel = vec2(1)/vec2(textureSize(u_tex, 0));
		pixel.y = 0.0;
		vec3 color = texture(u_tex, v_texCoord).rgb*w[0];
		for (int i = 1 ; i < 5 ; i++) {
			color += texture(u_tex, v_texCoord+pixel*float(i)).rgb*w[i];
			color += texture(u_tex, v_texCoord-pixel*float(i)).rgb*w[i];
		}
		fragColor = vec4(color, 1.0);
	}`
);
const blurV_shader = new Shader(
	//VERTEX SHADER CODE
	base_vertex_shader,
	//FRAGMENT SHADER CODE
	`#version 300 es
	precision mediump float;
	uniform sampler2D u_tex;
	in vec2 v_position;
	in vec2 v_texCoord;
	out vec4 fragColor;
	void main() {
		float w[5] = float[] (0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
		vec2 pixel = vec2(1)/vec2(textureSize(u_tex, 0));
		pixel.x = 0.0;
		vec3 color = texture(u_tex, v_texCoord).rgb*w[0];
		for (int i = 1 ; i < 5 ; i++) {
			color += texture(u_tex, v_texCoord+pixel*float(i)).rgb*w[i];
			color += texture(u_tex, v_texCoord-pixel*float(i)).rgb*w[i];
		}
		fragColor = vec4(color, 1.0);
	}`
);

const base_shader = new Shader(
	//VERTEX SHADER CODE
	`#version 300 es
	layout(location = 0) in vec2 a_offset;
	layout(location = 1) in vec2 a_position;
	layout(location = 2) in vec2 a_scale;
	layout(location = 3) in vec2 a_tex;
	//layout(location = 4) in float a_fill;
	//layout(location = 5) in vec3 a_color;
	uniform vec2 u_screen;
	uniform vec3 u_camera;
	out vec2 v_texCoord;
	out vec3 v_color;
	flat out int v_tex;
	vec2 u_atlasSize = vec2(4, 14);
	void main() {
		gl_Position = vec4((a_position+a_offset*a_scale-u_camera.xy)*u_camera.zz/u_screen, 1, 1);
		v_texCoord = (a_tex+a_offset)/u_atlasSize;
		v_color = vec3(1);
		v_tex = int(a_tex.y);
	}`,

	//FRAGMENT SHADER CODE
	`#version 300 es
	precision mediump float;
	uniform sampler2D u_tex;
	in vec2 v_texCoord;
	in vec3 v_color;
	flat in int v_tex;
	layout(location = 0) out vec4 baseColor;
	layout(location = 1) out vec4 brightColor;
	void main() {
		baseColor = texture(u_tex, v_texCoord)*vec4(v_color, 1);
		if (v_tex==5 || v_tex==6 || v_tex==9 || v_tex==11) {
			brightColor = baseColor;
		} else {
			brightColor = vec4(0);
		}
	}`
);

texture_shader.bind();
gl.uniform2f(texture_shader.uniforms.u_screen, 1, 1);
gl.uniform1iv(texture_shader.uniforms.u_tex, [1, 2]);

blurH_shader.bind();
gl.uniform2f(blurH_shader.uniforms.u_screen, 1, 1);
gl.uniform1i(blurH_shader.uniforms.u_tex, 2);

blurV_shader.bind();
gl.uniform2f(blurV_shader.uniforms.u_screen, 1, 1);
gl.uniform1i(blurV_shader.uniforms.u_tex, 3);

base_shader.bind();
gl.uniform2f(base_shader.uniforms.u_screen, ECRAN_LARGEUR/2, ECRAN_HAUTEUR/2);
gl.uniform1i(base_shader.uniforms.u_tex, 0);
