const TAILLE_ECRAN = 640;
const CIEL = "#AACCFF";

let ECRAN = null;
const CLAVIER = {};
const HAUT = "ARROWUP";
const BAS = "ARROWDOWN";
const GAUCHE = "ARROWLEFT";
const DROITE = "ARROWRIGHT";

//---------------------------------------------------------------------------------------

function perf(f) {
	let start = new Date().getTime();
	for (i = 0; i < 50000000; ++i) {
		f();
	}
	let end = new Date().getTime();
	return end - start;
}

function initialisation() {
	console.log("initialisation");
	ECRAN = document.getElementById("ecran");
	ECRAN.width = TAILLE_ECRAN;
	ECRAN.height = TAILLE_ECRAN;
	ECRAN.style.width = `${TAILLE_ECRAN}px`;
	ECRAN.style.height = `${TAILLE_ECRAN}px`;

	ECRAN = ECRAN.getContext("2d");
	ECRAN.imageSmoothingEnabled = false;
	requestAnimationFrame(tick);
}
window.onload = initialisation;

function dessine_carré(x, y, w, h, couleur) {
	ECRAN.fillStyle = couleur;
	ECRAN.fillRect(x, y, w, h);
}

function dessine_image(x, y, w, h, img) {
	ECRAN.drawImage(img, 0, 0, img.width, img.height, x, y, w, h);
}

function touche_pressée(e) {
	CLAVIER[e.key.toUpperCase()] = true;
}
function touche_relachée(e) {
	CLAVIER[e.key.toUpperCase()] = false;
}
document.addEventListener("keydown", touche_pressée);
document.addEventListener("keyup", touche_relachée);

function charge_image(url) {
	let img = new Image();
	img.onload = function() {
		console.log(url, "loaded");
	};
	img.src = "img/"+url;
	return img;
}


//=======================================================================================
//=======================================================================================

class Atlas {
	constructor(atlas, taille, animations) {
		this.atlas = atlas;
		this.taille = taille;
		this.animations = animations;
	}

	dessine(x, y, w, h, id, tick) {
		let animation = this.animations[id];
		if (animation == null) {
			animation = 0;
		} else {
			animation = Math.floor(tick/animation[0])%animation[1];
		}
		ECRAN.drawImage(this.atlas, this.taille*animation, this.taille*id, this.taille, this.taille, x, y, w, h);
	}
}

//---------------------------------------------------------------------------------------

function chunk_id(x, y) {
	return `${x} ${y}`;
}

function rnd(a, b) {
	return a+Math.random()*(b-a);
}

class Monde {
	constructor(taille_chunk, atlas) {
		this.taille_chunk = taille_chunk;
		this.atlas = atlas;
		this.tick = 0;
		this.chunks = new Map();

		this.cache_chunk = null;
		this.cache_x = Infinity;
		this.cache_y = Infinity;
	}

	update() {
		for (let chunk of this.chunks.values()) {
			chunk.update(this, this.tick);
		}
	}

	genere_chunk(x, y) {
		let chunk = new Chunk(this.taille_chunk, x, y);
		this.chunks.set(chunk_id(x, y), chunk);
		return chunk;
	}

	get_chunk(x, y) {
		let chunk = this.chunks.get(chunk_id(x, y));
		if (chunk === undefined) {
			return this.genere_chunk(x, y);
		}
		return chunk;
	}

	_get_bloc(x, y) {
		let taille_chunk = this.taille_chunk;
		if (x >= this.cache_x && y >= this.cache_y && x < this.cache_x+taille_chunk && y < this.cache_y+taille_chunk) {
			return this.cache_chunk.get_bloc(x-this.cache_x, y-this.cache_y);
		}
		let chunk_x = Math.floor(x / taille_chunk);
		let chunk_y = Math.floor(y / taille_chunk);
		this.cache_x = chunk_x*taille_chunk;
		this.cache_y = chunk_y*taille_chunk;
		let bloc_x = x - this.cache_x;
		let bloc_y = y - this.cache_y;
		this.cache_chunk = this.get_chunk(chunk_x, chunk_y);
		return this.cache_chunk.get_bloc(bloc_x, bloc_y);
	}

	get_bloc(x, y) {
		let chunk_x = Math.floor(x / this.taille_chunk);
		let chunk_y = Math.floor(y / this.taille_chunk);
		let bloc_x = x - chunk_x*this.taille_chunk;
		let bloc_y = y - chunk_y*this.taille_chunk;
		return this.get_chunk(chunk_x, chunk_y).get_bloc(bloc_x, bloc_y);
	}

	set_bloc(x, y, bloc) {
		let chunk_x = Math.floor(x / this.taille_chunk);
		let chunk_y = Math.floor(y / this.taille_chunk);
		let bloc_x = x - chunk_x*this.taille_chunk;
		let bloc_y = y - chunk_y*this.taille_chunk;
		return this.get_chunk(chunk_x, chunk_y).set_bloc(bloc_x, bloc_y, bloc);
	}

	dessine(x, y, offset_x, offset_y, taille, rayon) {
		let chunk_x = Math.floor(x / this.taille_chunk);
		let chunk_y = Math.floor(y / this.taille_chunk);
		if (OPTIM) {
			for (let dx=-rayon; dx<=rayon; dx++) {
				for (let dy=-rayon; dy<=rayon; dy++) {
					let chunk = this.chunks.get(chunk_id(chunk_x+dx, chunk_y+dy));
					if (chunk !== undefined) {
						chunk.dessine(x-offset_x, y-offset_y, taille, this.atlas, this.tick);
					}
				}
			}
		} else {
			for (let chunk of this.chunks.values()) {
				chunk.dessine(x-offset_x, y-offset_y, taille, this.atlas, this.tick);
			}
		}
		this.tick++;
	}
}

function terrain(x, y) {
	let f = 20;
	let l1 = noise.perlin2(x/f, y/f)+1;
	let l2 = noise.perlin2(x/(2*f), y/(2*f))+1;
	return (l1+l2/2)*y/100;
}

class Chunk {
	constructor(taille_chunk, ox, oy) {
		ox *= taille_chunk;
		oy *= taille_chunk;
		this.x = ox;
		this.y = oy;
		this.taille_chunk = taille_chunk;
		this.blocs = Array(taille_chunk).fill().map(()=>Array(taille_chunk).fill())
		for (let y=0; y<taille_chunk; y++) {
			for (let x=0; x<taille_chunk; x++) {
				let val = terrain(ox+x, oy+y);
				if (val<0.5) {
					this.blocs[y][x] = new Air();
				} else if (val < 0.6) {
					if (terrain(ox+x, oy+y-1)<0.5) {
						this.blocs[y][x] = new Herbe();
					} else {
						this.blocs[y][x] = new Terre();
					}
				} else {
					this.blocs[y][x] = new Pierre();
				}
			}
		}
	}

	update(monde, tick) {
		let ox = this.x;
		let oy = this.y;
		let taille_chunk = this.taille_chunk;
		for (let y=0; y<taille_chunk; y++) {
			for (let x=0; x<taille_chunk; x++) {
				let bloc = this.blocs[y][x];
				if (bloc.last_update < tick) {
					bloc.last_update = tick;
					bloc.update(ox+x, oy+y, monde, tick);
				}
			}
		}
	}

	get_bloc(x, y) {
		return this.blocs[y][x];
	}

	set_bloc(x, y, bloc) {
		let old = this.blocs[y][x];
		this.blocs[y][x] = bloc;
		return old;
	}

	dessine(ox, oy, taille, atlas, tick) {
		let taille_chunk = this.taille_chunk;
		ox = this.x-ox;
		oy = this.y-oy;
		const niveau = Math.floor(taille/NIVEAU_MAX);
		for (let y=0; y<taille_chunk; y++) {
			for (let x=0; x<taille_chunk; x++) {
				let bloc = this.blocs[y][x];
				let capacite = bloc.capacite()*niveau;
				if (APLAT && capacite>0 && capacite<taille && y>0 && this.blocs[y-1][x].niveau>0) {
					capacite = 0;
				}
				atlas.dessine((ox+x)*taille, (oy+y)*taille+capacite, taille, taille-capacite, bloc.id, tick);
			}
		}
	}
}

//---------------------------------------------------------------------------------------

class Bloc {
	constructor(tick) {
		this.last_update = tick;
	}
	update() {
		return false;
	}
	capacite() {
		return 0;
	}
	rempli() {}
}

class Air extends Bloc {
	id = 0;
	capacite() {
		return NIVEAU_MAX;
	}
	rempli(x, y, monde, niveau, direction) {
		if (this.niveau == niveau) {
			return;
		}
		monde.set_bloc(x, y, new Eau(monde.tick, x, y, niveau, direction));
	}
}

class Pierre extends Bloc {
	id = 1;
}

class Herbe extends Bloc {
	id = 2;
}

class Terre extends Bloc {
	id = 3;
}

class Bois extends Bloc {
	id = 7;
}

let NIVEAU_MAX = 4;
const DIRECTION_AUCUNE = 0;
const DIRECTION_DROITE = 1;
const DIRECTION_GAUCHE = -1;
class Eau extends Bloc {
	id = 6;
	constructor(tick, x, y, niveau=NIVEAU_MAX, direction=DIRECTION_AUCUNE) {
		super(tick);
		this.niveau = niveau;
		this.direction = direction;
	}

	capacite() {
		return NIVEAU_MAX-this.niveau;
	}

	rempli(x, y, monde, niveau, direction) {
		if (this.niveau == niveau) {
			return;
		}
		this.niveau = niveau;
		this.direction = direction;
		this.last_update = monde.tick;
	}

	update(x, y, monde, tick) {
		if (this.niveau == 0) {
			monde.set_bloc(x, y, new Air(tick));
			return false;
		}

		let bas = monde.get_bloc(x, y+1);
		let capacite_bas = bas.capacite();
		if (capacite_bas > 0) {
			let quantite = Math.min(this.niveau, capacite_bas);
			this.niveau -= quantite;
			bas.rempli(x, y+1, monde, NIVEAU_MAX + quantite - capacite_bas, DIRECTION_AUCUNE);
		}

		if (this.niveau == 0) {
			return true;
		}

		let droite = monde.get_bloc(x+1, y);
		let gauche = monde.get_bloc(x-1, y);
		let capacite_droite = droite.capacite();
		let capacite_gauche = gauche.capacite();
		if (capacite_droite > 0 && capacite_gauche > 0) {
			let quantite = this.niveau + 2*NIVEAU_MAX - capacite_droite - capacite_gauche;
			let repartition = Math.floor(quantite/3);
			let reste = quantite - 3*repartition;
			this.niveau = repartition;
			if (reste == 0) {
				droite.rempli(x+1, y, monde, repartition, DIRECTION_AUCUNE);
				gauche.rempli(x-1, y, monde, repartition, DIRECTION_AUCUNE);
			} else if (reste == 2) {
				droite.rempli(x+1, y, monde, repartition+1, DIRECTION_DROITE);
				gauche.rempli(x-1, y, monde, repartition+1, DIRECTION_GAUCHE);
			} else if (this.direction == DIRECTION_DROITE) {
				droite.rempli(x+1, y, monde, repartition+1, DIRECTION_DROITE);
				gauche.rempli(x-1, y, monde, repartition, DIRECTION_AUCUNE);
			} else {
				droite.rempli(x+1, y, monde, repartition, DIRECTION_AUCUNE);
				gauche.rempli(x-1, y, monde, repartition+1, DIRECTION_GAUCHE);
			}
		} else if (capacite_droite > 0) {
			let quantite = this.niveau + NIVEAU_MAX - capacite_droite;
			let repartition = Math.floor(quantite/2);
			this.niveau = repartition;
			droite.rempli(x+1, y, monde, quantite - repartition, DIRECTION_DROITE);
		} else if (capacite_gauche > 0) {
			let quantite = this.niveau + NIVEAU_MAX - capacite_gauche;
			let repartition = Math.floor(quantite/2);
			this.niveau = repartition;
			gauche.rempli(x-1, y, monde, quantite - repartition, DIRECTION_GAUCHE);
		}
		return true;
	}
}

class Tronc extends Bloc {
	id = 6;
	constructor(tick, x, y, dx=0, dy=-1, age=50) {
		super(tick);
		this.x = x;
		this.y = y;
		this.dx = dx;
		this.dy = dy;
		this.age = age;
	}

	update(x, y, monde, tick) {
		monde.set_bloc(x, y, new Bois());
		if (this.age == 0 || (this.age<30 && Math.random() > 0.9)) {
			monde.set_bloc(x, y, new Feuilles(tick, x, y, 0, this.age/8+4));
		}
		if (this.age <= 0) {
			return;
		}
		x = this.x+this.dx;
		y = this.y+this.dy;
		let dx = this.dx+rnd(-0.2, 0.2);
		let dy = this.dy+rnd(-0.2, 0.2);
		let d  = Math.sqrt(dx*dx+dy*dy);
		monde.set_bloc(
			Math.floor(x),
			Math.floor(y),
			new Tronc(tick, x, y, dx/d, dy/d, this.age-1),
		)
	}
}

class Feuilles extends Bloc {
	id = 8;
	constructor(tick, x, y, r=0, mr=50) {
		super(tick);
		this.x = x;
		this.y = y;
		this.r = r;
		this.mr = mr;
	}

	update(x, y, monde, tick) {
		let nx, ny;
		if (this.r < this.mr) {
			this.r += 0.1;
		} else {
			return false;
		}
		let r2 = this.r*this.r;
		let ox = x-this.x;
		let oy = y-this.y;
		for (let [dx, dy] of [[-1, 0], [0, -1], [1, 0], [0, 1]]) {
			nx = ox+dx;
			ny = oy+dy;
			if (nx*nx+ny*ny <= r2 && monde.get_bloc(x+dx, y+dy).id == 0) {
				monde.set_bloc(x+dx, y+dy, new Feuilles(tick, this.x, this.y, this.r, this.mr));
			}
		}
		return true;
	}
}

class Sable extends Bloc {
	id = 6;
	update(x, y, monde, tick) {
		let bloc;
		for (let dx of [0, -1, 1]) {
			bloc = monde.get_bloc(x+dx, y+1);
			if (bloc.id == 0) {
				monde.set_bloc(x+dx, y+1, this);
				monde.set_bloc(x, y, bloc);
				return true;
			}
		}
		return false;
	}
}

//=======================================================================================
//=======================================================================================


const jean = charge_image("jean.png");
const atlas = new Atlas(
	charge_image("atlas.png"),
	8,
	[
		null,
		null,
		null,
		null,
		null,
		[10, 2],
		[15, 3]
	]
);
const TAILLE_CHUNK = 8;
const monde = new Monde(TAILLE_CHUNK, atlas);

let x = 0;
let y = 0;
let OPTIM = false;
let VITESSE = 2;
let ZOOM = 24;
let RADIUS = 2;
let BLOC = Eau;
let APLAT = true;
let TIME = 2;

function tick() {
	dessine_carré(0, 0, TAILLE_ECRAN, TAILLE_ECRAN, CIEL);

	let blocs = Math.ceil(TAILLE_ECRAN/ZOOM);
	for (let dx=-RADIUS; dx<=RADIUS; dx++) {
		for (let dy=-RADIUS; dy<=RADIUS; dy++) {
			monde.get_bloc(x+dx*TAILLE_CHUNK, y+dy*TAILLE_CHUNK);
		}
	}
	if (monde.tick%TIME == 0) {
		monde.update();
	}
	monde.dessine(x, y, blocs/2, blocs/2, ZOOM, 2*RADIUS);

	//---------------------------------------------------------------------------------------
	if (CLAVIER[HAUT] || CLAVIER["Z"]) {
		y -= VITESSE;
	}
	if (CLAVIER[BAS] || CLAVIER["S"]) {
		y += VITESSE;
	}
	if (CLAVIER[GAUCHE] || CLAVIER["Q"]) {
		x -= VITESSE;
	}
	if (CLAVIER[DROITE] || CLAVIER["D"]) {
		x += VITESSE;
	}
	if (CLAVIER[" "]) {
		monde.set_bloc(x, y, new BLOC(0, x, y));
	}

	//---------------------------------------------------------------------------------------
	requestAnimationFrame(tick);
}
