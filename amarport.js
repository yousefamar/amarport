var AMARPORT = {};

AMARPORT.loadGraphSync = function (url) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, false);
	xhr.send();
	return JSON.parse(xhr.responseText);
};

AMARPORT.Node = function (obj) {
	this.label = obj.label || '';
	this.children = [];
	this.radius = 10;

	for (var i = 0, len = obj.children.length; i < len; i++)
		this.addChild(new AMARPORT.Node(obj.children[i]));
	
	var canvas = AMARPORT.ctx.canvas;
	this.x = canvas.width/2 + Math.random()*500 - 250;
	this.y = canvas.height/2 + Math.random()*500 - 250;
	this.netForce = { x: 0, y: 0 };
};

AMARPORT.Node.prototype.addChild = function (child) {
	this.children.push(child);
	return this;
};

AMARPORT.Node.prototype.forEachPre = function (func) {
	if (func(this))
		return true;
	for (var i = 0, len = this.children.length; i < len; i++)
		this.children[i].forEachPre(func);
};

AMARPORT.Node.prototype.distTo = function (node) {
	return Math.sqrt((node.x - this.x)*(node.x - this.x) + (node.y - this.y)*(node.y - this.y));
};

AMARPORT.Node.prototype.addForce = function (otherNode) {
	var dist = this.distTo(otherNode) || 0.0001;
	var distX = (this.x - otherNode.x) || 0.0001, distY = (this.y - otherNode.y) || 0.0001;
	var dirX = distX/dist, dirY = distY/dist;

	this.netForce.x += 10000*dirX/(dist*dist);
	this.netForce.y += 10000*dirY/(dist*dist);

	if (this.children.indexOf(otherNode) >= 0) {
		var force = 0.1 * (dist - 100);

		otherNode.netForce.x += dirX*force;
		otherNode.netForce.y += dirY*force;

		this.netForce.x -= dirX*force;
		this.netForce.y -= dirY*force;
	}
};

AMARPORT.Node.prototype.contains = function (x, y) {
	return Math.sqrt((x - this.x)*(x - this.x) + (y - this.y)*(y - this.y)) <= this.radius;
};

AMARPORT.Node.prototype.render = function (ctx) {
	for (var i = 0, len = this.children.length; i < len; i++) {
		var child = this.children[i];

		ctx.beginPath();
		ctx.moveTo(this.x, this.y);
		ctx.lineTo(child.x, child.y);
		ctx.strokeStyle = 'red';
		//ctx.lineWidth = 1;
		ctx.stroke();

		child.render(ctx);
	}

	ctx.beginPath();
	ctx.arc(this.x, this.y, this.radius, 0, 2*Math.PI);
	ctx.fillStyle = this.contains(ctx.mousePos.x, ctx.mousePos.y)?'yellow':'green';
	ctx.fill();

	ctx.fillStyle = 'white';
	ctx.fillText(this.label, this.x, this.y-this.radius-2);
	ctx.fillStyle = 'cyan';
	ctx.fillText('('+this.x.toFixed(2)+', '+this.y.toFixed(2)+')', this.x, this.y+this.radius+12);
	//ctx.lineWidth = 2;
	ctx.strokeStyle = '#003300';
	ctx.stroke();
};


AMARPORT.main = function () {
	var canvas = document.getElementById('canvas');
	var ctx = AMARPORT.ctx = canvas.getContext('2d');

	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	window.addEventListener('resize', function(){
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}, false);


	var centerX = canvas.width/2, centerY = canvas.height/2;

	var root = new AMARPORT.Node(AMARPORT.loadGraphSync('graph.json'));

	ctx.mousePos = { x: 0, y: 0 };

	var dragee = null;

	canvas.addEventListener('mousedown', function (event) {
		var mouseX = event.offsetX===undefined?event.layerX:event.offsetX;
		var mouseY = event.offsetY===undefined?event.layerY:event.offsetY;
		root.forEachPre(function (node) {
			if (node.contains(mouseX, mouseY)) {
				dragee = node;
				return true;
			}
		});
	}, false);

	canvas.addEventListener('mousemove', function (event) {
		var mouseX = event.offsetX===undefined?event.layerX:event.offsetX;
		var mouseY = event.offsetY===undefined?event.layerY:event.offsetY;
		ctx.mousePos.x = mouseX;
		ctx.mousePos.y = mouseY;
		if (dragee) {
			dragee.x = mouseX;
			dragee.y = mouseY;
		}
	}, false);

	canvas.addEventListener('mouseup', function (event) {
		dragee = null;
	}, false);


	const TICK_INTERVAL_MS = 1000.0/60.0;

	function tick() {
		// FIXME: Chrome throttles the interval down to 1s on inactive tabs.
		setTimeout(tick, TICK_INTERVAL_MS);

		root.forEachPre(function (node) {
			root.forEachPre(function (otherNode) {
				if (otherNode === node)
					return;

				node.addForce(otherNode);
			});

			if (node !== dragee) {
				node.x += node.netForce.x;
				node.y += node.netForce.y;
			}
			node.netForce.x = 0;
			node.netForce.y = 0;
		});
	}

	function render () {
		requestAnimFrame(render);

		ctx.fillStyle = 'black';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		ctx.beginPath();
		ctx.moveTo(ctx.mousePos.x, ctx.mousePos.y);
		ctx.lineTo(ctx.mousePos.x+1, ctx.mousePos.y+1);
		ctx.strokeStyle = 'white';
		//ctx.lineWidth = 1;
		ctx.stroke();

		root.render(ctx);
	}

	setTimeout(tick, TICK_INTERVAL_MS);

	window.requestAnimFrame = window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			function(callback){
				window.setTimeout(callback, 1000/60);
			};
	requestAnimFrame(render);
};