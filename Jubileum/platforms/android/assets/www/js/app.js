var app = {
	
    initialize: function() {
		this.bindEvents();
    },

    bindEvents: function() {
		var self = this;
		document.addEventListener('deviceready', function() {
			self.onDeviceReady();
		}
		, false);
		
//		self.onDeviceReady();
	},

    onDeviceReady: function() {
		var source   = $("#quizquestion-template").html();

		var self = this;

		self.questionTemplate = Handlebars.compile(source);	
		//TODO use promises -- moewahaha  
		self.loadQuestions(
			function() {
				self.loadAnswers(
					function() {
						self.loadWayPoints(
							function() {
								self.renderQuestions();
							}
						);
					}
				);
			}
		);

		//app.receivedEvent('deviceready');
    },
	
	loadQuestions : function(callback) {
		var self = this;
		
		$.jsonp({
			url: 'data/questions.json',
			success: function(data, status) {
				for(var i=0; i<data.length; i++){
					var question = data[i];
					question.id = i;
					question.displayId = i + 1;
				}	
			
				self.questions = data;

				if(callback) {
					callback();
				}
			},
			error: function(options, status){
				console.log('can not load questions: ' + status);
			}
		});
	},
	
	loadAnswers : function(callback) {
		var answers = [
		];

		for(var i=0; i<this.questions.length; i++){
			var answer = {
			  answered: false,
			  nearWaypoint : true
		    };
			
			answers.push(answer);
		}		
	
		this.answers = answers;
		
		if(callback) {
			callback();
		}
	},

	loadWayPoints : function(callback) {
		var self = this;

		$.jsonp({
			url: 'data/waypoints.json',
			success: function(data, status) {			
				self.waypoints = data;

				if(callback) {
					callback();
				}
			},
			error: function(options, status){
				console.log('can not load waypoints: ' + status);
			}
		});
	},
	
	renderQuestions : function() {	
		for(var i=0; i<this.questions.length; i++){
			var question = this.questions[i];
			var waypoint = this.waypoints[i];

			var node = $('#timeline');			
			var state = this.calculateState(i);

			this.renderQuestion(question, waypoint, state, node, false);
		} 
	},
	
	//state 0 = not unlocked; 1 = unlocked ; 2 = answered 
	calculateState : function(questionId) {
		var previousAnswer = {answered: true, nearWaypoint: true};
		var answer = this.answers[questionId];
		
		var previousQuestionId = questionId - 1;
		if (previousQuestionId > -1) {
				previousAnswer = this.answers[previousQuestionId];
		}
		
		if(answer.answered) {
			//state = answered
			return 2;
		}
		
		if (previousAnswer.answered && answer.nearWaypoint) {
			//state = unlocked
			return 1;
		}
		
		return 0;
	},
	
	renderQuestion : function(question, waypoint, state, node, replace) {
			var scope = this.createScope(question, waypoint, state);
			
			
			
			var html = this.questionTemplate(scope);
			if(replace) {
				$(node).html(html);
			}else{
				$(node).append(html);
			}
	},

	createScope : function(question, waypoint, state) {
			var scope = {
				question : question,
				waypoint : waypoint,
//				state : {
//					blocked : state < 1,
//					unlocked : state < 2,
//					answered : state == 2
//				}

//tijdelijke hack
				state : {
					blocked : state == 0,
					unlocked : state == 1,
					answered : state == 2
				}
			};

			return scope;
		
	},
	
	updateQuestion : function(updatedQuestionId) {
			var question = this.questions[updatedQuestionId];
			var waypoint = this.waypoints[updatedQuestionId];

			var node = $('#q' + updatedQuestionId);
			var state = this.calculateState(updatedQuestionId);

			this.renderQuestion(question, waypoint, state, node, true);
	},
	
	loadState : function() {
	},

	storeState : function() {
	},
	
	answerQuestion : function(questionId, answerId) {
		var correctAnswer = this.questions[questionId].correctAntwoord;
		
		if(answerId == correctAnswer) {
			this.answers[questionId].answered = true;
			this.updateQuestion(questionId);

			var nextQuestionId = questionId + 1;
			if(nextQuestionId == this.questions.length) {
				this.finish();
			}else{
				this.updateQuestion(nextQuestionId);
			}

		} else {
			alert("oops");
			var failSnd = new Media( '/android_asset/www/failure.wav' );
		alert(failSnd);
			failSnd.play();

			alert("played");
		}
	},
	
	finish : function() {
	},

	
//,
    // Update DOM on a Received Event
//    receivedEvent: function(id) {
//        var parentElement = document.getElementById(id);
//        var listeningElement = parentElement.querySelector('.listening');
//        var receivedElement = parentElement.querySelector('.received');
//
//        listeningElement.setAttribute('style', 'display:none;');
//        receivedElement.setAttribute('style', 'display:block;');
//
//       console.log('Received Event: ' + id);
//    }
};
