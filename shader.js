
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
	vec2 u_atlasSize = vec2(4, 14);
	void main() {
		gl_Position = vec4((a_position+a_offset*a_scale)/u_screen-vec2(1), 1, 1)*vec4(1, -1, 1, 1);
		v_texCoord = (a_tex+a_offset)/u_atlasSize;
		//v_texCoord = (a_offset+a_tex)/vec2(4, 7);
		v_color = vec3(1);
	}`,

	//FRAGMENT SHADER CODE
	`#version 300 es
	precision mediump float;
	uniform sampler2D u_tex;
	in vec2 v_texCoord;
	in vec3 v_color;
	out vec4 fragColor;
	void main() {
		fragColor = texture(u_tex, v_texCoord)*vec4(v_color, 1);
	}
	`
);

base_shader.bind();
gl.uniform1i(base_shader.uniforms.u_tex, 0);
gl.uniform2f(base_shader.uniforms.u_screen, ECRAN_LARGEUR/2, ECRAN_HAUTEUR/2);
