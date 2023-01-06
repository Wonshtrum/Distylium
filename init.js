const ECRAN_LARGEUR = 1024;
const ECRAN_HAUTEUR = 640;

const FLOAT_SIZE = 4;

const SOURIS = {};
const CLAVIER = {};

const HAUT = "ARROWUP";
const BAS = "ARROWDOWN";
const GAUCHE = "ARROWLEFT";
const DROITE = "ARROWRIGHT";

Array.prototype.sum = function() {return this.reduce((a, b) => a+b, 0);}


//---------------------------------------------------------------------------------------

function perf(f) {
	let start = new Date().getTime();
	for (i = 0; i < 50000000; ++i) {
		f();
	}
	let end = new Date().getTime();
	return end - start;
}

//---------------------------------------------------------------------------------------

/*
function dessine_carré(x, y, w, h, couleur) {
	ECRAN.fillStyle = couleur;
	ECRAN.fillRect(x, y, w, h);
}

function dessine_image(x, y, w, h, img) {
	ECRAN.drawImage(img, 0, 0, img.width, img.height, x, y, w, h);
}
*/

function touche_pressée(e) {
	CLAVIER[e.key.toUpperCase()] = true;
}
function touche_relachée(e) {
	CLAVIER[e.key.toUpperCase()] = false;
}
function souris(e) {
	SOURIS.bouton = e.buttons;
	SOURIS.x = e.clientX;
	SOURIS.x = e.clientY;
	SOURIS.bloc_x = Math.floor((e.clientX-8-ECRAN_LARGEUR/2)/ZOOM);
	SOURIS.bloc_y = Math.floor((e.clientY-8-ECRAN_HAUTEUR/2)/ZOOM);
}
document.addEventListener("keydown", touche_pressée);
document.addEventListener("keyup", touche_relachée);
document.addEventListener("mousemove", souris);
document.addEventListener("mousedown", souris);
document.addEventListener("mouseup", souris);

//---------------------------------------------------------------------------------------

console.log("initialisation");
const ECRAN = document.getElementById("ecran");
ECRAN.width = ECRAN_LARGEUR;
ECRAN.height = ECRAN_HAUTEUR;
ECRAN.style.width = `${ECRAN_LARGEUR}px`;
ECRAN.style.height = `${ECRAN_HAUTEUR}px`;

// ECRAN = ECRAN.getContext("2d");
// ECRAN.imageSmoothingEnabled = false;
const gl = ECRAN.getContext("webgl2", {preserveDrawingBuffer: true, premultipliedAlpha: false});
