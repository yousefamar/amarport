var AMARPORT = {};

AMARPORT.cols = [
	'#e8e4e3',
	'#313b5e',
	'#a1a4ab',
	'#acc3d4',
	'#666464',
	'#d2d6d9'
];

AMARPORT.loadGraphSync = function (url) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, false);
	xhr.send();
	return JSON.parse(xhr.responseText);
};

AMARPORT.Node = function (obj) {
	this.label = obj.label || '';
	this.desc = obj.desc || '';
	this.parent = null;
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
	child.parent = this;
	this.children.push(child);
	return this;
};

AMARPORT.Node.prototype.forEachPre = function (func) {
	if (func(this))
		return true;
	for (var i = 0, len = this.children.length; i < len; i++)
		if (this.children[i].forEachPre(func))
			return true;
};

AMARPORT.Node.prototype.forEachPost = function (func) {
	for (var i = 0, len = this.children.length; i < len; i++)
		if (this.children[i].forEachPost(func))
			return true;
	if (func(this))
		return true;
};

AMARPORT.Node.prototype.distTo = function (node) {
	return Math.sqrt((node.x - this.x)*(node.x - this.x) + (node.y - this.y)*(node.y - this.y));
};

AMARPORT.Node.prototype.addForce = function (otherNode) {
	var dist = this.distTo(otherNode) || 0.0001;
	var distX = (this.x - otherNode.x) || 0.0001, distY = (this.y - otherNode.y) || 0.0001;
	var dirX = distX/dist, dirY = distY/dist;

	this.netForce.x += 100*this.radius*otherNode.radius*dirX/(dist*dist);
	this.netForce.y += 100*this.radius*otherNode.radius*dirY/(dist*dist);

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
		ctx.strokeStyle = AMARPORT.cols[4];
		//ctx.lineWidth = 1;
		ctx.stroke();

		child.render(ctx);
	}

	ctx.beginPath();
	ctx.arc(this.x, this.y, this.radius, 0, 2*Math.PI);
	ctx.fillStyle = this.contains(AMARPORT.mousePos.x, AMARPORT.mousePos.y)?AMARPORT.cols[5]:this.children.length?AMARPORT.cols[2]:AMARPORT.cols[3];
	ctx.fill();
	if (this.parent === null)
		ctx.drawImage(AMARPORT.me, this.x-AMARPORT.me.width/2, this.y-AMARPORT.me.height/2);
	if (this === AMARPORT.selected) {
		ctx.lineWidth = 2;
		ctx.strokeStyle = AMARPORT.cols[1];
		ctx.stroke();
		ctx.lineWidth = 1;
	}

	ctx.textAlign = 'center';
	ctx.fillStyle = AMARPORT.cols[1];
	ctx.fillText(this.label, this.x, this.y-this.radius-2);
	//ctx.fillStyle = AMARPORT.cols[2];
	//ctx.fillText('('+this.x.toFixed(2)+', '+this.y.toFixed(2)+')', this.x, this.y+this.radius+12);
};


AMARPORT.main = function () {
	var infoArea = document.getElementById('infoArea');
	infoArea.style.backgroundColor = AMARPORT.cols[0];
	infoArea.style.webkitBoxShadow = '0 0 1em '+AMARPORT.cols[4];
	infoArea.style.mozBoxShadow = '0 0 1em '+AMARPORT.cols[4];
	infoArea.style.boxShadow = '0 0 1em '+AMARPORT.cols[4];

	var infoTitle = document.getElementById('infoTitle');
	infoTitle.style.backgroundColor = AMARPORT.cols[5];
	infoTitle.style.borderBottom = '2px groove '+AMARPORT.cols[2];

	var infoBody = document.getElementById('infoBody');
	infoBody.style.backgroundColor = AMARPORT.cols[0];


	var canvas = document.getElementById('canvas');
	var ctx = AMARPORT.ctx = canvas.getContext('2d');

	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	window.addEventListener('resize', function(){
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}, false);


	AMARPORT.me = new Image(); 
	AMARPORT.me.src = 'me-small.png';

	function select (node) {
		AMARPORT.selected = node;
		infoTitle.innerHTML = node.label;
		infoBody.innerHTML = node.desc;
	}

	var root = new AMARPORT.Node(AMARPORT.loadGraphSync('graph.json'));
	root.forEachPost(function (node) {
		if (node.children.length)
			return;
		for (var current = node.parent; current; current = current.parent)
			current.radius++;
	});
	select(root);

	AMARPORT.mousePos = { x: 0, y: 0 };

	var dragee = null;

	function down (event) {
		root.forEachPre(function (node) {
			if (node.contains(event.pageX, event.pageY)) {
				select(node);
				dragee = node;
				return true;
			}
		});
	}

	function move (event) {
		AMARPORT.mousePos.x = event.pageX;
		AMARPORT.mousePos.y = event.pageY;
		if (dragee) {
			dragee.x = event.pageX;
			dragee.y = event.pageY;
		}
	}

	function up (event) {
		dragee = null;
	}

	document.addEventListener('mousedown', down, false);
	document.addEventListener('touchstart', function (event) { event.preventDefault(); down(event.targetTouches[0]); }, false);
	document.addEventListener('mousemove', move, false);
	document.addEventListener('touchmove', function (event) { move(event.targetTouches[0]); }, false);
	document.addEventListener('mouseup', up, false);
	document.addEventListener('touchend', function (event) { up(event.targetTouches[0]); }, false);


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

		ctx.fillStyle = AMARPORT.cols[0];
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		/*
		ctx.beginPath();
		ctx.moveTo(AMARPORT.mousePos.x, AMARPORT.mousePos.y);
		ctx.lineTo(AMARPORT.mousePos.x+1, AMARPORT.mousePos.y+1);
		ctx.strokeStyle = 'white';
		//ctx.lineWidth = 1;
		ctx.stroke();
		*/

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