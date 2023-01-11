function charge_image(url) {
	let img = new Image();
	img.onload = function() {
		console.log(url, "loaded");
	};
	img.crossOrigin = "";
	img.src = "img/"+url;
	return img;
}

const texture_vide = () => {
	let texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
	return texture;
}

let TEXTURES = {};
const charge_texture = (source, nom) => {
	let texture = texture_vide();
	let image = new Image();
	image.src = "img/"+source;
	image.onload = () => {
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		gl.generateMipmap(gl.TEXTURE_2D);
		console.log(source, "chargée");
	};
	TEXTURES[nom] = texture;
};

function attache_texture() {
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, TEXTURES["atlas"]);
	console.log("textures attachées");
}

charge_texture("atlas.png", "atlas");
setTimeout(attache_texture, 100);
