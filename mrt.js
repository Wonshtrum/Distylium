class VertexArray {
	constructor(buffer, layout, hint) {
		//VERTEX ARRAY
		this.va = gl.createVertexArray();
		gl.bindVertexArray(this.va);

		//CPU BUFFERS
		let total_size = layout.sum();
		this.quad_count = buffer.length/(4*total_size);
		this.vertex_buffer = new Float32Array(buffer);
		let index_buffer = new Uint16Array(6*this.quad_count);
		let offset = 0;
		for (let i = 0 ; i < index_buffer.length ; i += 6) {
			index_buffer[i + 0] = offset + 0;
			index_buffer[i + 1] = offset + 1;
			index_buffer[i + 2] = offset + 2;

			index_buffer[i + 3] = offset + 0;
			index_buffer[i + 4] = offset + 2;
			index_buffer[i + 5] = offset + 3;

			offset += 4;
		}

		//GPU BUFFERS
		this.vb = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vb);
		gl.bufferData(gl.ARRAY_BUFFER, this.vertex_buffer, hint);
		this.ib = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ib);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index_buffer, gl.STATIC_DRAW);

		//LAYOUT
		let stride = 0;
		for (let i = 0 ; i < layout.length ; i++) {
			gl.enableVertexAttribArray(i);
			gl.vertexAttribPointer(i, layout[i], gl.FLOAT, false, total_size*FLOAT_SIZE, stride*FLOAT_SIZE);
			stride += layout[i];
		}
	}
	bind() {
		gl.bindVertexArray(this.va);
	}
	draw() {
		gl.drawElements(gl.TRIANGLES, 6*this.quad_count, gl.UNSIGNED_SHORT, 0);
	}
};


class FrameBuffer {
	constructor(width, height, n, tex0) {
		this.tex0 = tex0 || 0;
		this.n = n;
		this.width = width;
		this.height = height;
		this.tex = Array(n);
		this.fbo = gl.createFramebuffer();
		this.attachments = Array.from({length:n}, (_, i)=>gl.COLOR_ATTACHMENT0+i);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
		for (let i = 0 ; i < n ; i++) {
			gl.activeTexture(gl.TEXTURE0+i+this.tex0);
			this.tex[i] = texture_vide();
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, this.attachments[i], gl.TEXTURE_2D, this.tex[i], 0);
		}
	}
	resize(width, height) {
		this.width = width;
		this.height = height;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
		for (let i = 0 ; i < this.n ; i++) {
			gl.activeTexture(gl.TEXTURE0+i+this.tex0);
			gl.bindTexture(gl.TEXTURE_2D, this.tex[i]);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		}
	}
	bind() {
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
		gl.drawBuffers(this.attachments);
		gl.viewport(0, 0, this.width, this.height);
		for (let i = 0 ; i < this.n ; i++) {
			gl.activeTexture(gl.TEXTURE0+i+this.tex0);
			gl.bindTexture(gl.TEXTURE_2D, this.tex[i]);
		}
	}
	unbind() {
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.drawBuffers([gl.BACK]);
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	}
};
const unbindAllFbo = FrameBuffer.prototype.unbind;
