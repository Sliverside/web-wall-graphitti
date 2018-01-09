function getPointDiff(a,b) {
  return a - b;
}
function getPointDist(a,b) {
  if(a > b) { return a - b; }
  else      { return b - a; }
}
function getDiag(L, l) {
  return Math.sqrt((L * L) + (l * l));
}

var gui, stage, socket, connections = {};

var mousePosition;
var offset = [0,0];
var cnvs = document.getElementById('cnvs');
var isDown = false;
var isSpaceBarDown = false;

cnvs.style.left = window.innerWidth / 2 - cnvs.offsetWidth / 2;
cnvs.style.top = window.innerHeight / 2 - cnvs.offsetHeight / 2;

cnvs.addEventListener('mousedown', function(e) {
		isDown = true;
		offset = [
				cnvs.offsetLeft - e.clientX,
				cnvs.offsetTop - e.clientY
		];
}, true);

document.addEventListener('mouseup', function() {
		isDown = false;
}, true);

document.addEventListener('keydown', function(e) {
	if(e.key == ' '){
		isSpaceBarDown = true;
		cnvs.style.cursor = "move";
	}
}, true);

document.addEventListener('keyup', function(e) {
	if(e.key == ' '){
		isSpaceBarDown = false;
		cnvs.style.cursor = "crosshair";
	}
}, true);

document.addEventListener('mousemove', function(event) {
		event.preventDefault();
		if (isDown && isSpaceBarDown) {
				mousePosition = {

						x : event.clientX,
						y : event.clientY

				};
				cnvs.style.left = (mousePosition.x + offset[0]) - 40 + 'px';
				cnvs.style.top  = (mousePosition.y + offset[1]) - 40 + 'px';
		}
}, true);

$(document).ready(function() {

	gui = new gui();
	var canvas = document.getElementById('cnvs');
	canvas.width  = 3000;
	canvas.height = 3000;
	iniDrawing();
	initSocket();
});

function gui()
{
	var _shape = 'Circle';
	var _stroke = {
		color : '#000000',
		alpha : 0,
		rainbow : false
	}
	var _fill = {
		color : '#00b0d9',
		alpha : 100,
		rainbow : false
	}
	var _size = 25;
	var _wiggle = 0;
	var _onSave = function() {};

	Object.defineProperty(this, "shape", 		{get: function() {return _shape;}});
	Object.defineProperty(this, "size", 		{get: function() {return _size;}});
	Object.defineProperty(this, "stroke", 		{get: function() {return _stroke;}});
	Object.defineProperty(this, "fill", 		{get: function() {return _fill;}});
	Object.defineProperty(this, "wiggle", 		{get: function() {return _wiggle;}});

	var o = {
		'Draw Style'		: _shape,
		'Stroke Color'	 	: _stroke.color,
		'Stroke Opacity'	: _stroke.alpha,
		'Rainbow Stroke !'	: _stroke.rainbow,
		'Fill Color'	 	: _fill.color,
		'Fill Opacity'	 	: _fill.alpha,
		'Rainbow Fill !'	: _fill.rainbow,
		'Brush Size'		: _size,
		'Wiggle Wobble'		: _wiggle,
		'Clear Canvas'		: function() { stage.clear();},
		'Save as PNG'		: function() { savepng(); }
	}

	setTimeout(function(){
		var gui = new dat.GUI({ autoPlace: false });
		//gui.add(o, 'Draw Style', [ 'Line', 'Circle', 'Square', 'Triangle' ] ).onChange(function(val){_shape=val});
		gui.addColor(o, 'Stroke Color').onChange(function(val){ _stroke.color = val; });
		gui.add(o, 'Stroke Opacity', 1, 100).onChange(function(val){ _stroke.alpha = val; });
		gui.add(o, 'Rainbow Stroke !').onChange(function(val){ _stroke.rainbow = val; });
		gui.addColor(o, 'Fill Color').onChange(function(val){ _fill.color = val; });
		gui.add(o, 'Fill Opacity', 1, 100).onChange(function(val){ _fill.alpha = val; });
		gui.add(o, 'Rainbow Fill !').onChange(function(val){ _fill.rainbow = val; });
		gui.add(o, 'Brush Size', 1, 100).onChange(function(val){ _size = val; });
		gui.add(o, 'Wiggle Wobble', 0, 20).onChange(function(val){ _wiggle = val; });
		var cl = gui.add(o, 'Clear Canvas');
		var sv = gui.add(o, 'Save as PNG');
		var div = document.getElementById('gui');
		div.appendChild(gui.domElement);
	}, 100);

}

function iniDrawing()
{
	var data = {};

	stage = new JS3('cnvs');
	stage.interactive = true;
	stage.drawClean = false;
	stage.windowTitle = 'Web Wall Graphitti (fork from doodle - made by braitsch)';

	stage.down = start;
	stage.enter = start;
	stage.up = stop;
	stage.leave = stop;
	function start(e)
	{
		if (stage.mousePressed && !isSpaceBarDown){
			data.originX = e.x;
			data.originY = e.y;
			stage.move = onMouseMove;
		}
	}

	function stop()
	{
		stage.move = null;
		window.document.body.style.cursor = 'default';
	}

	function onMouseMove(e)
	{
		data.targetX = e.x;
		data.targetY = e.y;
		data.diffX = getPointDiff(data.originX, data.targetX);
		data.diffY = getPointDiff(data.originY, data.targetY);
		data.distX = getPointDist(data.originX, data.targetX);
		data.distY = getPointDist(data.originY, data.targetY);
		data.diag = getDiag(data.distX ,data.distY);
		data.ratioX = data.distX / data.diag;
		data.ratioY = data.distY / data.diag;

		data.shape = gui.shape;
		data.fill = gui.fill;
		data.stroke = gui.stroke;
		data.size = gui.size;
		data.wiggle = gui.wiggle;
		if (data.fill.rainbow) data.fill.color = '#'+Math.floor(Math.random()*16777215).toString(16);
		if (data.stroke.rainbow) data.stroke.color = '#'+Math.floor(Math.random()*16777215).toString(16);
		if (data.shape == 'Line'){
			drawLine(data);
		}	else if (gui.shape == 'Circle'){
			drawCircle(data);
		}	else if (gui.shape == 'Square'){
			drawSquare(data);
		}	else if (gui.shape == 'Triangle'){
			drawTriangle(data);
		}
		socket.emit('draw-data', data);
		data.originX = data.targetX;
		data.originY = data.targetY;
	}
}

var drawLine = function(e)
{
	if (e.wiggle == 0){
		stage.drawLine({x1:e.x1,	 y1:e.y1, x2:e.x2, y2:e.y2,
			strokeColor:e.stroke.color, strokeWidth:e.size, alpha:e.stroke.alpha, capStyle:'round'});
	}	else{
		var max = (e.wiggle * 10);
		var min =-(e.wiggle * 10);
		var dir = e.x2 < e.x1 ? - 1 : 1;
		var r = Math.floor(Math.random() * (max - min + 1)) + min;
		stage.drawArc({x1:e.x1, y1:e.y1, xc:e.x2-(25*dir), yc:e.y1+r, x2:e.x2, y2:e.y2,
			strokeColor:e.stroke.color, strokeWidth:e.size, alpha:e.stroke.alpha, capStyle:'round'});
	}
}

var drawCircle = function(e)
{
	for(i = 1; i < e.diag; i++) {
		if (e.diffX <= 0) { e.curentX = i*e.ratioX; }
		else            { e.curentX = - i*e.ratioX; }
		if (e.diffY <= 0) { e.curentY = i*e.ratioY; }
		else            { e.curentY = - i*e.ratioY; }
		stage.drawCircle({
			x: e.originX + e.curentX - (gui.size/2),
			y: e.originY + e.curentY - (gui.size/2),
			size: e.size,
			fillColor: e.fill.color,
			fillAlpha: e.fill.alpha/100,
			strokeColor: e.stroke.color,
			strokeAlpha: e.stroke.alpha/100
		});
	}
	stage.drawCircle({
		x:e.targetX-(gui.size/2),
		y:e.targetY-(gui.size/2), size:e.size,
		fillColor:e.fill.color,
		fillAlpha:e.fill.alpha/100,
		strokeColor:e.stroke.color,
		strokeAlpha:e.stroke.alpha/100
	});
}

var drawSquare = function(e)
{
	stage.drawRect({x:e.x1-(e.size/2), y:e.y1-(e.size/2), size:e.size,
		fillColor:e.fill.color, fillAlpha:e.fill.alpha/100, strokeColor:e.stroke.color, strokeAlpha:e.stroke.alpha/100});
}

var drawTriangle = function(e)
{
	stage.drawTri({x:e.x1-(e.size/2), y:e.y1-(e.size/2), size:e.size,
		fillColor:e.fill.color, fillAlpha:e.fill.alpha/100, strokeColor:e.stroke.color, strokeAlpha:e.stroke.alpha/100});
}

function initSocket()
{
	socket = io.connect(':3000/doodle');
	socket.on('status', function (data) {
		connections = data;
		var i=0; for (p in connections) i++;
		var s = i > 1 ? ' are '+i+' People ' : ' is '+i+' Person ';
		$('#connected').html('There '+s+' Currently Connected');
	});
	socket.on('draw-data', function (data) {
		connections[data.id] = data;
		if (data.targetX && data.targetY){
			if (data.shape == 'Line'){
				drawLine(data);
			}	else if (data.shape == 'Circle'){
				drawCircle(data);
			}	else if (data.shape == 'Square'){
				drawSquare(data);
			}	else if (data.shape == 'Triangle'){
				drawTriangle(data);
			}
		}
	});
}


/*
	automation test
*/

// var data = {};
// var pos = {
// 	x : Math.random()*window.innerWidth,
// 	y : Math.random()*window.innerHeight,
// 	dx: 1,
// 	dy: 1,
// }
// setInterval(function(){
// 	if (pos.x < 0 || pos.x > window.innerWidth) pos.dx*=-1;
// 	if (pos.y < 0 || pos.y > window.innerHeight) pos.dy*=-1;
// 	pos.x+=(pos.dx*5);
// 	pos.y+=(pos.dy*5);
// 	data.targetX = pos.x;
// 	data.targetY = pos.y;
// 	data.x1 = data.x1 || data.targetX;
// 	data.y1 = data.y1 || data.targetY;
// 	data.shape = gui.shape;
// 	data.fill = gui.fill;
// 	data.stroke = gui.stroke;
// 	data.size = gui.size;
// 	data.wiggle = gui.wiggle;
// 	if (data.fill.rainbow) data.fill.color = '#'+Math.floor(Math.random()*16777215).toString(16);
// 	if (data.stroke.rainbow) data.stroke.color = '#'+Math.floor(Math.random()*16777215).toString(16);
// 	if (data.shape == 'Line'){
// 		drawLine(data);
// 	}	else if (gui.shape == 'Circle'){
// 		drawCircle(data);
// 	}	else if (gui.shape == 'Square'){
// 		drawSquare(data);
// 	}	else if (gui.shape == 'Triangle'){
// 		drawTriangle(data);
// 	}
// 	socket.emit('draw-data', data);
// 	data.x1 = data.targetX;
// 	data.y1 = data.targetY;
// }, .1);
