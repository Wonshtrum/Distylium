let LOCK = false;
class Batch {
	constructor(max_quad) {
		//VERTEX ARRAY
		this.va = gl.createVertexArray();
		gl.bindVertexArray(this.va);

		//BATCH
		this.max_quad = max_quad;
		this.quad = 0;
		this.index = 0;

		//CPU BUFFERS
		const model_data = new Float32Array([
			0, 0,
			1, 0,
			1, 1,
			0, 1,
		]);
		let index_data = new Uint16Array([
			0, 1, 2,
			0, 2, 3
		]);
		//[x, y, w, h, texture, animation, fill, r, g, b]
		let layout = [2, 2, 2];
		let total_size = layout.sum();
		this.transform_data = new Float32Array(total_size*max_quad);

		//GPU BUFFERS
		this.model_vb = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.model_vb);
		gl.bufferData(gl.ARRAY_BUFFER, model_data, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2*FLOAT_SIZE, 0);

		this.transform_vb = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.transform_vb);
		gl.bufferData(gl.ARRAY_BUFFER, this.transform_data, gl.DYNAMIC_DRAW);
		let stride = 0;
		for (let i = 0 ; i < layout.length ; i++) {
			gl.enableVertexAttribArray(i+1);
			gl.vertexAttribPointer(i+1, layout[i], gl.FLOAT, false, total_size*FLOAT_SIZE, stride*FLOAT_SIZE);
			gl.vertexAttribDivisor(i+1, 1);
			stride += layout[i];
		}

		this.model_ib = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.model_ib);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index_data, gl.STATIC_DRAW);
	}
	bind() {
		gl.bindVertexArray(this.va);
		//gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ib);
	}
	begin() {
		if (LOCK) return;
		this.quad = 0;
		this.index = 0;
	}
	draw_quad(x, y, w, h, tex, anim, fill, r, g, b) {
		if (this.quad >= this.max_quad) {
			this.flush();
			this.begin();
		}
		this.transform_data[this.index + 0] = x;
		this.transform_data[this.index + 1] = y;
		this.transform_data[this.index + 2] = w;
		this.transform_data[this.index + 3] = h;
		this.transform_data[this.index + 4] = anim;
		this.transform_data[this.index + 5] = tex;
		//this.transform_data[this.index + 6] = f;
		//this.transform_data[this.index + 7] = r;
		//this.transform_data[this.index + 8] = g;
		//this.transform_data[this.index + 9] = b;
		this.index += 6;
		this.quad++;
	}
	flush() {
		//gl.bindBuffer(gl.ARRAY_BUFFER, this.vb);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.transform_data, 0, this.index);
		//gl.drawElements(gl.TRIANGLES, 6*this.quad, gl.UNSIGNED_SHORT, 0);
		gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, this.quad);
	}
}
