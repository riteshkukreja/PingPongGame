var PingPong = function(config) {
	var canvas = config.canvas || document.createElement("canvas");
	
	if(!config.canvas) {
		// if new canvas
		// add it to body 
		document.body.appendChild(canvas);
	}

	var context = canvas.getContext("2d");

	// Width and Height dimensions of the canvas
	canvas.width = config.width || 640;
	canvas.height = config.height || 360;

	this.screen = null;

	var background = function(color) {
		context.fillStyle = color;
		context.fillRect(0, 0, canvas.width, canvas.height);
	}

	var random = function(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	// mouse show/hide
	var showMouse = function() {
		canvas.style.cursor = "pointer";
	}
	var hideMouse = function() {
		canvas.style.cursor = "none";
	}

	var Button = function(value, x, y, w, h, context) {
		// create shadow box
		context.fillStyle = "rgba(0, 0, 0, .15)";
		context.fillRect(x+3, y+3, w+3, h+3);

		context.fillStyle = "#FFFFFF";
		context.fillRect(x, y, w, h);

		context.fillStyle = COLORS.red;
		context.font="20px Georgia";
		context.fillText(value, x + w/2 - value.length*5, y + h/2 + 5);

		this.click = function(posx, posy) {
			if(posx >= x && posx <= x+w && posy >= y && posy <= y+h) return true;
			return false;
		}
	}

	var COLORS = {
		default: "black",
		blue: "#3F51B5",
		red: "#F44336",
		ball: "white",
		back: "#111",
		line: "#616161",
		redb: "#B71C1C",
		white: "#FFFFFF"
	};

	var newGameButton = null;
	var World = function(level) {
		var gameInterval;

		// Width and Height of paddle and radius of circle
		var paddle_width = level.paddle_width || 5,
		paddle_height = level.paddle_height || 100,
		ball_radius = level.ball_radius || 10;

		var framesPerSecond = 60;

		// position of left and right paddle
		this.player1 = null, this.player2 = null, this.ball = null;

		// vector constructor
		var Vector = function(x, y) {
			this.x = x;
			this.y = y;

			this.update = function(x, y) {
				this.x = x;
				this.y = y;
			}

			this.copy = function() {
				return new Vector(this.x, this.y);
			}
		}

		var Paddle = function(config) {
			this.width = config.width || 5;
			this.height = config.height || 100;
			this.color = config.color || "white"; 

			this.position = config.position || new Vector(0, 0);

			var self = this;

			this.reset = function() {
				self.position = config.position || new Vector(0, 0);
			}

			this.moveTo = function(yPos) {
				self.position.y = yPos;

				if(self.position.y - self.height/2 < 0)
					self.position.y = self.height/2;
				else if(self.position.y + self.height/2 > canvas.height)
					self.position.y = canvas.height - self.height/2; 
			}

			this.draw = function(score) {
				context.fillStyle = self.color;
				context.fillRect(self.position.x, self.position.y - (self.height/2), self.width, self.height);

				context.font="40px Georgia";
				var edge_offset = 40;

				// left player score
				context.fillText(score, (self.position.x < canvas.width/2 ? canvas.width/2 - edge_offset: canvas.width/2 + edge_offset), edge_offset);
			} 

			this.collision = function(pos, offset) {
				if(	pos.y + offset >= self.position.y - self.height/2 && 
					pos.y + offset <= self.position.y + self.height/2 && 
					((	pos.x - offset <= self.position.x + self.width && self.position.x < self.width) || 
						(pos.x + offset >= self.position.x && self.position.x > self.width)))
					return true;
				return false;
			}
		}

		var Ball = function(config) {
			this.radius = config.radius || 10;
			this.color = config.color || "white";
			this.position = config.position || new Vector(0, 0);

			var temp = random(-3, 3);
			this.x_velocity = (temp >= 0 ? temp+3: temp-3);
			this.y_velocity = (temp >= 0 ? temp+3: temp-3);

			this.acceleration = config.acceleration || 0.8;

			var self = this;

			var collision = function(player1, player2) {
				if(	(player1.paddle.collision(self.position, self.radius) && self.x_velocity < 0) || 
					(player2.paddle.collision(self.position, self.radius) && self.x_velocity > 0)) {
					// collision with paddles
				self.x_velocity = -self.x_velocity;
				if(self.x_velocity < 0)
					self.x_velocity -= self.acceleration;
				else
					self.x_velocity += self.acceleration;

			} else if(self.position.x < 0) {
				player2.updateScore();
				self.reset();
			} else if(self.position.x > canvas.width) {
				player1.updateScore();
				self.reset();
			} else if(self.position.y < self.radius || self.position.y > canvas.height-self.radius) {
				self.y_velocity = -self.y_velocity;
			}
		}

		this.reset = function() {
			// position of left and right paddle
			self.position = new Vector(canvas.width/2, canvas.height/2);

			// ball velocity
			var temp = random(-3, 3);
			self.x_velocity = (temp >= 0 ? temp+3: temp-3);
			self.y_velocity = (temp >= 0 ? temp+3: temp-3);
		}

		this.draw = function(pad1, pad2) {
			collision(pad1, pad2);

			self.position.x += self.x_velocity;
			self.position.y += self.y_velocity;

			context.fillStyle = self.color;
			context.beginPath();
			context.arc(self.position.x, self.position.y, self.radius, 0, 2*Math.PI);
			context.fill();
		} 
	} 

	var Player = function(config) {
		this.yPos = config.position.y || 0;
		this.paddle = new Paddle(config);

		this.score = 0;

		// AI player
		var ai = function(ball_pos, yPos) {
			var ai_shift = level.ai_shift || 3;

			if(ball_pos.y < yPos)
				return yPos - ai_shift;
			else if(ball_pos.y > yPos)
				return yPos + ai_shift;
			return yPos;
		}

		// Intelligent AI player
		var lastBallPos = new Vector(canvas.width/2, canvas.height/2);
		var ai_intelligent = function(ball_pos, yPos) {
			var ai_shift = level.ai_shift || 3;
			var res = yPos;		
			var neg = 1;		

			// if ball is going away from AI, the skip
			if(ball_pos.x < lastBallPos.x) {
				lastBallPos = ball_pos.copy();
				return yPos;
			}

			// get slope
			var slope = (ball_pos.y - lastBallPos.y) / (ball_pos.x - lastBallPos.x);
			if(isNaN(slope)) return yPos;

			// get y position at which x is equal to canvas width
			var yBallPos = slope * (canvas.width - ball_pos.x) + ball_pos.y;

			// if yBallPos is less than 0, then ball will hit the upper boundary
			// else if greater than canvas height, then ball will hit the lower boundary
			// else ball will go throught the right 
			if(yBallPos < 0) {
				// upper boundary will hit
				// get the x position at which the upper bounary will hit
				var topHitXPos = (-ball_pos.y / slope ) + ball_pos.x;

				// reverse slope
				slope = -slope;

				// find the next y position at which the ball hit the right boundary
				var rightHitYPos = slope * (canvas.width - topHitXPos);

				res = rightHitYPos;

			} else if(yBallPos > canvas.height) {
				// lower boundary will hit
				// get the x position at which the upper bounary will hit
				var topHitXPos = ((canvas.height - ball_pos.y) / slope ) + ball_pos.x;

				// reverse slope
				slope = -slope;

				// find the next y position at which the ball hit the right boundary
				var rightHitYPos = slope * (canvas.width - topHitXPos);

				res = canvas.height + rightHitYPos;

			} else {
				// right boundary will hit
				res = yBallPos;
			}

			lastBallPos = ball_pos.copy();

			if(res < yPos - this.paddle.width/2)
				return yPos - ai_shift;
			else if(res > yPos + this.paddle.width/2)
				return yPos + ai_shift;
			return yPos;
		}

		this.won = function() {
			return this.score >= 5;
		}

		if(config.intelligent)
			this.actor = config.actor || ai_intelligent;
		else
			this.actor = config.actor || ai;

		var self = this; 

		var getNewPosition = function(ball_pos) {
			self.yPos = self.actor(ball_pos, self.yPos);
		}

		this.reset = function() {
			self.score = 0;
			self.paddle.reset();
		}

		this.updateScore = function() {
			self.score++;
		}

		this.draw = function(ball_pos) {
			getNewPosition(ball_pos);

			self.paddle.moveTo(self.yPos);
			self.paddle.draw(self.score);
		}
	}

	// Mouse movement
	var LocalUser = function() {
		this.mouseX = 0, this.mouseY = 0;

		var self = this; 

		var mouseEvent = function(e) {
			if(e.offsetX) {
				self.mouseX = e.offsetX;
				self.mouseY = e.offsetY;
			}
			else if(e.layerX) {
				self.mouseX = e.layerX;
				self.mouseY = e.layerY;
			} else {
				return;
			}
		}

		canvas.addEventListener("mousemove", mouseEvent);

		this.pos = function(ball_pos, yPos) {
			return self.mouseY;
		}
	}

	var init = function() {
		hideMouse();
		this.player1 = new Player({
			position: new Vector(0, canvas.height/2),
			width: paddle_width,
			height: paddle_height,
			color: COLORS.blue,
			actor: (new LocalUser()).pos
		});

		this.player2 = new Player({
			position: new Vector(canvas.width - paddle_width, canvas.height/2),
			width: paddle_width,
			height: paddle_height,
			color: COLORS.red,
			intelligent: true
		});

		this.ball = new Ball({
			radius: ball_radius,
			color: COLORS.ball,
			position: new Vector(canvas.width/2, canvas.height/2),
			acceleration: level.acceleration || 0.8
		});	
	}

	var middleLine = function(color) {
		context.strokeStyle = color;
		context.beginPath();
		context.moveTo(canvas.width/2, 0);
		context.lineTo(canvas.width/2, canvas.height);
		context.stroke();
	}

	// game won or lost
	var gameOverFlag = false;
	var gameOver = function(color) {
		if(!this.player1.won() && !this.player2.won()) return;
		background(COLORS.redb);

		showMouse();
		gameOverFlag = true;

		window.clearInterval(gameInterval);
		context.font="bold 40px Georgia";
		context.fillStyle = color;

		var msg = '';
		if(this.player1.won())
			msg = "Player 1 won!";
		else if(this.player2.won())
			msg = "Player 2 won!";

		context.fillText(msg, canvas.width/2 - msg.length * 10, canvas.height/2 - 50);

			// add button to start new game
			newGameButton = new Button("New Game", canvas.width/2 - 80, canvas.height/2 + 80, 160, 40, context);
			canvas.addEventListener("click", function(e) {
				if(newGameButton != null) {
					var mouseX, mouseY;
					if(e.offsetX) {
						mouseX = e.offsetX;
						mouseY = e.offsetY;
					}
					else if(e.layerX) {
						mouseX = e.layerX;
						mouseY = e.layerY;
					} else {
						return;
					}

					if(newGameButton.click(mouseX, mouseY)) {
						// button is clicked
						gameOver = false;
						startScreen();

						// remove button
						newGameButton = null;
					}
				}
			});
		}



		var draw = function() {
			background(COLORS.back);
			middleLine(COLORS.line);

			this.ball.draw(this.player1, this.player2);
			this.player1.draw(this.ball.position);
			this.player2.draw(this.ball.position);
			
			gameOver(COLORS.white);
		}

		this.playing = false;

		this.begin = function() {
			// to start the game
			gameInterval = setInterval(draw, 1000 / framesPerSecond);
			self.playing = true;
		}

		var reset = function() {
			// reset the game
			this.player1.reset();
			this.player2.reset();
			this.ball.reset();
		}

		this.stop = function() {
			// to stop the game
			clearInterval(gameInterval);
			reset();
		}

		this.pause = function() {
			// to pause the game
			PausedMenu(COLORS.white);
			clearInterval(gameInterval);
			self.playing = false;
		}

		init();
	}

	var PausedMenu = function(color) {
		background(COLORS.redb);
		context.font="bold 40px Georgia";
		context.fillStyle = color;
		msg = 'PAUSED';
		context.fillText(msg, canvas.width/2 - msg.length * 10, canvas.height/2 - 50);

		context.font="20px Georgia";
		msg = 'Press space to continue';
		context.fillText(msg, canvas.width/2 - msg.length * 3.5, canvas.height/2 + 50);
	}

	var Levels = {
		"Beginner": {
			ai_shift: 3,
			paddle_width: 5,
			paddle_height: 100,
			ball_radius: 10,
			acceleration: 0.6
		},
		"Intermediate": {
			ai_shift: 5,
			paddle_width: 5,
			paddle_height: 80,
			ball_radius: 10,
			acceleration: 0.8
		},
		"Expert": {
			ai_shift: 10,
			paddle_width: 5,
			paddle_height: 50,
			ball_radius: 5,
			acceleration: 1.0
		}
	};

	// game type selection
	var startScreen = function() {
		showMouse();
		background(COLORS.redb);
		context.font="bold 40px Georgia";
		context.fillStyle = COLORS.white;
		context.fillText("PING PONG", canvas.width/2 - 110, canvas.height/2 - 100);

		var btn1 = new Button("Beginner", canvas.width/2 - 80, canvas.height/2 - 20, 160, 40, context);
		var btn2 = new Button("Intermediate", canvas.width/2 - 80, canvas.height/2 + 40, 160, 40, context);
		var btn3 = new Button("Expert", canvas.width/2 - 80, canvas.height/2 + 100, 160, 40, context);

		canvas.addEventListener("click", function(e) {
			if(newGameButton != null) return;

			var mouseX, mouseY;
			if(e.offsetX) {
				mouseX = e.offsetX;
				mouseY = e.offsetY;
			}
			else if(e.layerX) {
				mouseX = e.layerX;
				mouseY = e.layerY;
			} else {
				return;
			}

			if(btn1.click(mouseX, mouseY)) {
				// select Beginner level
				self.screen = new World(Levels.Beginner);
			} else if(btn2.click(mouseX, mouseY)) {
				// select Intermediate level
				self.screen = new World(Levels.Intermediate);
			} else if(btn3.click(mouseX, mouseY)) {
				// select Expert level
				self.screen = new World(Levels.Expert);
			}

			// comment it out if you wish to start manually with given constructor methods
			self.screen.begin();
		});
	}

	this.start = function() {
		self.screen.begin();
	}

	this.stop = function() {
		self.screen.stop();
	}

	this.pause = function() {
		self.screen.pause();
	}

	window.addEventListener('keypress', function(e) {
		var code = e.keyCode || e.charCode;
		if(code == 32 && self.screen.begin && self.screen.pause) {
			if(self.playing)
				self.screen.pause();
			else
				self.screen.begin();
		}
	});


	// fire it up
	startScreen();
}