class Atlas {
	constructor(atlas, taille, animations) {
		this.atlas = atlas;
		this.taille = taille;
		this.animations = animations;
	}

	dessine(x, y, w, h, id, tick, ctx) {
		let animation = this.animations[id];
		if (animation == null) {
			animation = 0;
		} else {
			animation = Math.floor(tick/animation[0])%animation[1];
		}
		//ECRAN.drawImage(this.atlas, this.taille*animation, this.taille*id, this.taille, this.taille, x, y, w, h);
		ctx.draw_quad(x, y, w, h, id, animation, 1, 1, 0, 0);
	}
}

//---------------------------------------------------------------------------------------

function chunk_id(x, y) {
	return `${x} ${y}`;
}

function rnd(a=-1, b=1) {
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

		this.entités = [];
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

	on_chunk(x, y, f) {
		let chunk = this.chunks.get(chunk_id(x, y));
		if (chunk === undefined) {
			return null;
		}
		return f(chunk);
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
		this.reveille(x, y);
		let chunk_x = Math.floor(x / this.taille_chunk);
		let chunk_y = Math.floor(y / this.taille_chunk);
		let bloc_x = x - chunk_x*this.taille_chunk;
		let bloc_y = y - chunk_y*this.taille_chunk;
		return this.get_chunk(chunk_x, chunk_y).set_bloc(bloc_x, bloc_y, bloc);
	}

	reveille(x, y) {
		let taille_chunk = this.taille_chunk;
		let chunk_x = Math.floor(x / taille_chunk);
		let chunk_y = Math.floor(y / taille_chunk);
		let bloc_x = x - chunk_x*taille_chunk;
		let bloc_y = y - chunk_y*taille_chunk;
		let actif = chunk => { chunk.actif = true; };
		this.on_chunk(chunk_x, chunk_y, actif);
		if (bloc_x == 0) {
			this.on_chunk(chunk_x-1, chunk_y, actif);
		} else if (bloc_x == taille_chunk-1) {
			this.on_chunk(chunk_x+1, chunk_y, actif);
		}
		if (bloc_y == 0) {
			this.on_chunk(x, chunk_y-1, actif);
		} else if (bloc_y == taille_chunk-1) {
			this.on_chunk(x, chunk_y+1, actif);
		}
	}

	dessine(rayon, ctx) {
		let chunk_x = Math.floor(x / this.taille_chunk);
		let chunk_y = Math.floor(y / this.taille_chunk);
		if (OPTIM) {
			for (let dx=-rayon; dx<=rayon; dx++) {
				for (let dy=-rayon; dy<=rayon; dy++) {
					let chunk = this.chunks.get(chunk_id(chunk_x+dx, chunk_y+dy));
					if (chunk !== undefined) {
						chunk.dessine(this.atlas, this.tick, ctx);
					}
				}
			}
		} else {
			for (let chunk of this.chunks.values()) {
				chunk.dessine(this.atlas, this.tick, ctx);
			}
		}
		for (let entité of this.entités) {
			entité.dessine(this.atlas, this.tick, ctx);
		}
		ctx.flush();
		ctx.begin();
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
		this.actif = true;
		this.blocs = Array(taille_chunk).fill().map(()=>Array(taille_chunk).fill());

		for (let y=0; y<taille_chunk; y++) {
			for (let x=0; x<taille_chunk; x++) {
				let val = terrain(ox+x, oy+y);
				if (val<0.5) {
					if (oy+y == 38) {
						this.blocs[y][x] = new Eau(0,0,0,NIVEAU_MAX-1);
					} else if (oy+y > 38) {
						this.blocs[y][x] = new Eau();
					} else {
						val = terrain(ox+x, oy+y+1);
						//if (val>=0.5 && val<0.501) {
						//	this.blocs[y][x] = new Tronc();
						if (val>=0.5 && val<0.51) {
							this.blocs[y][x] = new Touffe();
						} else {
							this.blocs[y][x] = new Air();
						}
					}
				} else if (val < 0.6) {
					if (oy+y<39 && terrain(ox+x, oy+y-1)<0.5) {
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
		if (!this.actif && PARESSEUX) {
			return;
		}
		let ox = this.x;
		let oy = this.y;
		let taille_chunk = this.taille_chunk;
		let actif = false;
		for (let y=0; y<taille_chunk; y++) {
			for (let x=0; x<taille_chunk; x++) {
				let bloc = this.blocs[y][x];
				if (bloc.last_update < tick) {
					bloc.last_update = tick;
					actif |= bloc.update(ox+x, oy+y, monde, tick);
				}
			}
		}
		this.actif = actif;
	}

	get_bloc(x, y) {
		return this.blocs[y][x];
	}

	set_bloc(x, y, bloc) {
		this.actif = true
		let old = this.blocs[y][x];
		this.blocs[y][x] = bloc;
		return old;
	}

	dessine(atlas, tick, ctx) {
		let taille_chunk = this.taille_chunk;
		let ox = this.x;
		let oy = this.y;
		const niveau = 1/NIVEAU_MAX;
		for (let y=0; y<taille_chunk; y++) {
			for (let x=0; x<taille_chunk; x++) {
				let bloc = this.blocs[y][x];
				if (bloc instanceof Air) continue;
				let capacite = 0;
				if (bloc instanceof Eau) {
					capacite = bloc.capacite();
					if (APLAT && capacite<NIVEAU_MAX && y>0 && this.blocs[y-1][x].niveau>0) {
						capacite = 0;
					}
				}
				capacite *= niveau;
				atlas.dessine(ox+x, oy+y+capacite, 1, 1-capacite, bloc.texture, tick, ctx);
			}
		}
		/*if (this.actif) {
			dessine_carré(ox*taille, oy*taille, taille_chunk*taille, taille_chunk*taille, "rgba(255, 0, 0, 0.1)");
		}*/
	}
}

//---------------------------------------------------------------------------------------

class Bloc {
	transparent = false;
	constructor(tick=0) {
		this.last_update = tick;
	}
	update() {
		return false;
	}
	capacite() {
		return 0;
	}
	rempli() {
		return false;
	}
	remplace() {
		return null;
	}
}

class Air extends Bloc {
	texture = 0;
	transparent = true;
	capacite() {
		return NIVEAU_MAX;
	}
	rempli(x, y, monde, niveau, direction) {
		monde.set_bloc(x, y, new Eau(monde.tick, x, y, niveau, direction));
	}
	remplace() {
		return this;
	}
}

class Pierre extends Bloc {
	texture = 1;
}

class Terre extends Bloc {
	texture = 3;
	update(x, y, monde, tick) {
		let bloc = monde.get_bloc(x, y-1);
		let actif = false;
		if (bloc.transparent && !(bloc instanceof Eau)) {
			for (let dy=-1; dy<=1; dy++) {
				for (let dx=-1; dx<=1; dx++) {
					if (monde.get_bloc(x+dx, y+dy) instanceof Herbe) {
						actif = true;
						if (Math.random()<0.04) {
							monde.set_bloc(x, y, new Herbe());
						}
					}
				}
			}
		}
		return actif;
	}
}

class Herbe extends Bloc {
	texture = 2;
	update(x, y, monde, tick) {
		if (monde.get_bloc(x, y-1) instanceof Eau) {
			if (Math.random()<0.02) {
				monde.set_bloc(x, y, new Terre());
			}
			return true;
		}
		return false;
	}
}

class Touffe extends Bloc {
	texture = 11;
	transparent = true;
	capacite() {
		return NIVEAU_MAX;
	}
	rempli(x, y, monde, niveau, direction) {
		monde.set_bloc(x, y, new Eau(monde.tick, x, y, niveau, direction));
	}
	remplace() {
		return new Air();
	}
	update(x, y, monde, tick) {
		if (!(monde.get_bloc(x, y+1) instanceof Herbe)) {
			monde.set_bloc(x, y, new Air());
			return true;
		}
		return false;
	}
}

class Bois extends Bloc {
	texture = 7;
}

let NIVEAU_MAX = 4;
const DIRECTION_AUCUNE = 0;
const DIRECTION_DROITE = 1;
const DIRECTION_GAUCHE = -1;
class Eau extends Bloc {
	texture = 6;
	transparent = true;
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
		monde.reveille(x, y);
		this.niveau = niveau;
		this.direction = direction;
		this.last_update = monde.tick;
	}

	remplace() {
		return this;
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
		let capacite = NIVEAU_MAX-this.niveau;
		if (capacite_droite > 0 && capacite_gauche > 0) {
			if (capacite_droite == capacite && capacite_gauche == capacite) {
				return false;
			}
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
			if (capacite_droite == capacite) {
				return false;
			}
			let quantite = this.niveau + NIVEAU_MAX - capacite_droite;
			let repartition = Math.floor(quantite/2);
			this.niveau = repartition;
			droite.rempli(x+1, y, monde, quantite - repartition, DIRECTION_DROITE);
		} else if (capacite_gauche > 0) {
			if (capacite_gauche == capacite) {
				return false;
			}
			let quantite = this.niveau + NIVEAU_MAX - capacite_gauche;
			let repartition = Math.floor(quantite/2);
			this.niveau = repartition;
			gauche.rempli(x-1, y, monde, quantite - repartition, DIRECTION_GAUCHE);
		} else {
			return false;
		}
		return true;
	}
}

function mix(a, b, m) {
	return a*(1-m)+b*m;
}

function mix2(x0, y0, x1, y1, m) {
	return [mix(x0, x1, m), mix(y0, y1, m)];
}

function round(x, y) {
	let d  = Math.sqrt(x*x+y*y);
	return [x/d, y/d];
}

function same(x0, y0, x1, y1) {
	return Math.floor(x0) == Math.floor(x1) && Math.floor(y0) == Math.floor(y1);
}


const BASE_FORK = 0.15;
const DIV_FORK = 0.3;
const DIV_LINE = 0.1;
class Tronc extends Bloc {
	texture = 6;
	constructor(tick, x, y, dx=0, dy=-1, age=40, fork=null) {
		super(tick);
		this.x = x;
		this.y = y;
		this.dx = dx;
		this.dy = dy;
		this.age = age;
		if (fork === null) {
			this.fork = age-8;
			this.fork = Math.min(age-4, Math.floor(age*0.75));
		} else {
			this.fork = fork;
		}
	}

	update(x, y, monde, tick) {
		monde.set_bloc(x, y, new Bois());
		if (this.age <= 0) {
			return true;
		}

		if (this.age <= this.fork) {
			let m = BASE_FORK+rnd(0, DIV_FORK);
			let dx = this.dx;
			let dy = this.dy;
			let [rx, ry] = round(...mix2(dx, dy, -dy, dx, m));
			let [lx, ly] = round(...mix2(dx, dy, dy, -dx, m));
			let rm = 1;
			let lm = 1;
			if (same(x, y, x+rx, y+ry)) {
				rm = 2;
			}
			if (same(x, y, x+lx, y+ly)) {
				lm = 2;
			}
			monde.set_bloc(
				Math.floor(x+lm*lx),
				Math.floor(y+lm*ly),
				new Tronc(tick, x+lm*lx, y+lm*ly, lx, ly, this.age)
			);
			monde.set_bloc(
				Math.floor(x+rm*rx),
				Math.floor(y+rm*ry),
				new Tronc(tick, x+rm*rx, y+rm*ly, rx, ry, this.age)
			);
			return true;
		}

		x = this.x+this.dx;
		y = this.y+this.dy;
		let [dx, dy] = round(this.dx+rnd()*DIV_LINE, this.dy+rnd()*DIV_LINE);
		monde.set_bloc(
			Math.floor(x),
			Math.floor(y),
			new Tronc(tick, x, y, dx, dy, this.age-1, this.fork),
		)
		return true;
	}
}

const COOL_DOWN = 20;
class Feuilles extends Bloc {
	texture = 8;
	transparent = true;
	constructor(tick, x, y, r=10) {
		super(tick);
		this.x = x;
		this.y = y;
		this.r = r;
		this.cd = COOL_DOWN;
	}

	update(x, y, monde, tick) {
		if (this.cd > 0) {
			this.cd--;
			return true;
		}
		let ox = x-this.x;
		let oy = y-this.y;
		let r2 = this.r*this.r;
		for (let [dx, dy] of [[-1, 0], [0, -1], [1, 0], [0, 1]]) {
			let nx = ox+dx;
			let ny = oy+dy;
			let nr = nx*nx+ny*ny;
			let valid = monde.get_bloc(x+dx, y+dy) instanceof Air;
			if (nr <= r2 && valid) {
				monde.set_bloc(x+dx, y+dy, new Feuilles(tick, this.x, this.y, this.r));
				this.cd = COOL_DOWN;
				return true;
			}
		}
		return false;
	}
}

class Sable extends Bloc {
	texture = 10;
	update(x, y, monde, tick) {
		for (let dx of [0, -1, 1]) {
			let remplaceur = monde.get_bloc(x+dx, y+1).remplace();
			if (remplaceur !== null) {
				let dy = 1;
				if (dx !== 0) {
					dy = 0;
					remplaceur = monde.get_bloc(x+dx, y).remplace();
					if (remplaceur === null) {
						continue;
					}
				}
				monde.set_bloc(x+dx, y+dy, this);
				monde.set_bloc(x, y, remplaceur);
				return true;
			}
		}
		return false;
	}
}

function collision(x, y, w, h, dx, dy, monde) {
	let min_x = Math.floor(x);
	let min_y = Math.floor(y);
	let max_x = Math.ceil(x+w);
	let max_y = Math.ceil(y+h);
	let flag = false;
	for (let j=min_y; j<max_y; j++) {
		for (let i=min_x; i<max_x; i++) {
			if (!monde.get_bloc(i, j).transparent) {
				if (dx>0 && i+1>x+w) {
					x = i-w;
					flag = true;
				} else if (dx<0 && i<x) {
					x = i+1;
					flag = true;
				} else if (dy>0 && j+1>y+h) {
					y = j-h;
					flag = true;
				} else if (dy<0 && j<y) {
					y = j+1;
					flag = true;
				}
			}
		}
	}
	return [x, y, flag];
}

GRAVITE = 0.2;
class Entité {
	texture = 1
	constructor(x, y, w, h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.vx = 0;
		this.vy = 0;
		this.au_sol = false;
	}
	update(vx, vy, monde) {
		this.vx += vx;
		this.vy += vy;
		if (!this.au_sol) {
			this.vy += GRAVITE;
		}
		let x = this.x;
		let y = this.y;
		let flag;
		[x, y, flag] = collision(x, y+this.vy, 0, this.vy, monde);
		if (flag) {
			if (this.vy > 0) {
				this.au_sol = true;
			}
			this.vy = 0;
		}
		[x, y, flag] = collision(x+this.vx, y, this.vx, 0, monde);
		if (flag) {
			this.vx = 0;
		}
		this.x = x;
		this.y = y;
	}
	dessine(atlas, tick, ctx) {
		atlas.dessine(this.x, this.y, this.w, this.h, this.texture, tick, ctx);
	}
}

//=======================================================================================
//=======================================================================================


// const jean = charge_image("jean.png");
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
let RAYON = 2;
let BLOC = Eau;
let APLAT = true;
let INTERVAL = 2;
let PARESSEUX = true;

let jean = new Entité(0, 0, 1, 1);
monde.entités.push(jean);

const batch = new Batch(1000);
let va1 = new VertexArray([
	0, 0, 0, 1,
	2, 0, 1, 1,
	2, 2, 1, 0,
	0, 2, 0, 0], [2, 2], gl.STATIC_DRAW);

// tex = [atlas, main, bright, blur]

const TEX_ATLAS = 0;
const TEX_MAIN = 1;
const TEX_BRIGHT = 2;
const TEX_BLUR = 3;
fbo_base = new FrameBuffer(64, 32, 1, TEX_MAIN);
fbo_blur = [new FrameBuffer(gl.canvas.width, gl.canvas.height, 1, TEX_BLUR), new FrameBuffer(gl.canvas.width, gl.canvas.height, 1, TEX_BRIGHT)];
unbindAllFbo();

function tick() {
	gl.clear(gl.COLOR_BUFFER_BIT);

	for (let dx=-RAYON; dx<=RAYON; dx++) {
		for (let dy=-RAYON; dy<=RAYON; dy++) {
			monde.get_bloc(x+dx*TAILLE_CHUNK, y+dy*TAILLE_CHUNK);
		}
	}
	if (monde.tick%INTERVAL == 0) {
		monde.update();
	}

	gl.uniform3f(base_shader.uniforms.u_camera, x, y, ZOOM);
	batch.bind();
	monde.dessine(2*RAYON, batch);
	//jean.update(0, 0);

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
	if (SOURIS.bouton == 1) {
		let bloc_x = x+SOURIS.bloc_x;
		let bloc_y = y+SOURIS.bloc_y;
		monde.set_bloc(bloc_x, bloc_y, new BLOC(0, bloc_x, bloc_y));
	}

	//---------------------------------------------------------------------------------------
	requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
