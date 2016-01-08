var app = {
	debug: true,
	radius: 0.1454395,
	restUrl: "http://185.107.212.156:8080/servicehost/message",	
    initialize: function() {
		this.bindEvents();
    },

    bindEvents: function() {
		var self = this;
		document.addEventListener('deviceready', function() {
			self.onDeviceReady();
			self.sendRestRequest({message : "De quizz is gestart!"});
		}
		, false);
		
//		self.onDeviceReady();
	},

	createGpsListener: function() {
		var self = this;
	
		//alert(navigator.geolocation);	
		navigator.geolocation.watchPosition(function(position) {
			/*alert(' Postion wathed!' + '\n' +
			  'Latitude: '          + position.coords.latitude          + '\n' +
			  'Longitude: '         + position.coords.longitude         + '\n' +
			  'Altitude: '          + position.coords.altitude          + '\n' +
			  'Accuracy: '          + position.coords.accuracy          + '\n' +
			  'Altitude Accuracy: ' + position.coords.altitudeAccuracy  + '\n' +
			  'Heading: '           + position.coords.heading           + '\n' +
			  'Speed: '             + position.coords.speed             + '\n' +
			  'Timestamp: '         + position.timestamp                + '\n');*/
		  self.updateQuestions(position.coords);
		}, 
		function (error) {
			alert(error);
		}, { timeout: 30000, enableHighAccuracy: true});
	},
	
    onDeviceReady: function() {
		var source   = $("#quizquestion-template").html();

		var self = this;

		self.questionTemplate = Handlebars.compile(source);	
		self.loadQuestions(
			function() {
				self.loadAnswers(
					function() {
						self.loadWayPoints(
							function() {
								self.renderQuestions();
								self.createGpsListener();
							}
						);
					}
				);
			}
		);
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
				alert('can not load questions: ' + status);
			}
		});
	},
	
	loadAnswers : function(callback) {
		var answers = [
		];

		for(var i=0; i<this.questions.length; i++){
			var answer = {
			  answered: false,
			  nearWaypoint : i==0
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
				alert('can not load waypoints: ' + status);
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
	
	//state 0 = not unlocked; 1 = waiting, 2 = unlocked ; 3 = answered 
	calculateState : function(questionId) {
		var previousAnswer = {answered: true, nearWaypoint: true};
		var answer = this.answers[questionId];
		
		var previousQuestionId = questionId - 1;
		if (previousQuestionId > -1) {
				previousAnswer = this.answers[previousQuestionId];
		}
		
		if(answer.answered) {
			//state = answered
			return 3;
		}
		
		if (previousAnswer.answered && answer.nearWaypoint) {
			//state = unlocked
			return 2;
		}
		
		if (previousAnswer.answered) {
			//state = waiting
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
				state : {
					blocked : state == 0,
					waiting : state == 1,
					unlocked : state == 2,
					answered : state == 3
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
		if(this.isGoodAnswer(questionId, answerId)) {			
			this.updateGpsPosition();
			
			this.answers[questionId].answered = true;
			this.updateQuestion(questionId);

			var nextQuestionId = questionId + 1;
			if(nextQuestionId == this.questions.length) {
				this.finish();
			}else{
				this.updateQuestion(nextQuestionId);
			}

		} else {
//			var failSnd = new Media( '/android_asset/www/failure.wav' );
//			alert(failSnd);
//			failSnd.play();
			alert("Vraag fout beantwoord");			
			var jsonData = {
				message: "Vraag fout beantwoord", 
				question: this.questions[questionId].vraag, 
				answer: answerId				
			};
			this.sendRestRequest(jsonData);
		}
	},
	
	isGoodAnswer : function(questionId, answerId) {
		var goodAnswers = this.questions[questionId].correctAntwoord;

		for(var i = 0; i < goodAnswers.length; i++) {
			if(goodAnswers[i] == answerId) {
				return true;
			}
		}
	
		return false;
	},
	
	finish : function() {
	},

	updateGpsPosition : function() {
		var self = this;
	
		//alert(navigator.geolocation);
	
		navigator.geolocation.getCurrentPosition(function(position) {
			/*alert('Latitude: '          + position.coords.latitude          + '\n' +
			  'Longitude: '         + position.coords.longitude         + '\n' +
			  'Altitude: '          + position.coords.altitude          + '\n' +
			  'Accuracy: '          + position.coords.accuracy          + '\n' +
			  'Altitude Accuracy: ' + position.coords.altitudeAccuracy  + '\n' +
			  'Heading: '           + position.coords.heading           + '\n' +
			  'Speed: '             + position.coords.speed             + '\n' +
			  'Timestamp: '         + position.timestamp                + '\n');*/
			  this.updateQuestions(position);
		}, 
		function (error) {
			if(this.debug) {
				alert(error);
			}
		}, {});
		
	},
	
onGpsSuccess : function(position) {
    alert('Latitude: '          + position.coords.latitude          + '\n' +
          'Longitude: '         + position.coords.longitude         + '\n' +
          'Altitude: '          + position.coords.altitude          + '\n' +
          'Accuracy: '          + position.coords.accuracy          + '\n' +
          'Altitude Accuracy: ' + position.coords.altitudeAccuracy  + '\n' +
          'Heading: '           + position.coords.heading           + '\n' +
          'Speed: '             + position.coords.speed             + '\n' +
          'Timestamp: '         + position.timestamp                + '\n');
	this.updateQuestions(position);	  
		  
},

onGpsError : function(error) {
    alert('code: '    + error.code    + '\n' +
          'message: ' + error.message + '\n');
},
updateQuestions : function(actual){	
	for(var i=0; i<this.waypoints.length; i++){
	   var position = this.waypoints[i].position;
	   	   
	   // hack -> eerste vraag heeft geen positie
	   if(i!=0 && this.withinBounds(position, actual)) {
			this.answers[i].nearWaypoint = true;
			this.updateQuestion(i);
			
			if(this.debug){
				alert("position reached for waypoint: "+i);
			}
			break;
	   }
	}
},
withinBounds : function(expected, actual) {
	var expectedLat = parseFloat(expected.latitude);
	var expectedLong = parseFloat(expected.longitude);

	var actualLat = parseFloat(actual.latitude);
	var actualLong = parseFloat(actual.longitude);

	var lattOk = actualLat <= (expectedLat + this.radius) && actualLat >= (expectedLat - this.radius);
	var longOk = actualLong <= (expectedLong + this.radius) && actualLong >= (expectedLong - this.radius);
	
	return lattOk && longOk;
},
sendRestRequest : function(data){
	try{
		
		$.post(this.restUrl, {"message": "dag marc, een berichtje uit de app"}, function(e){
			alert(e);
			
		});
	} catch(e){
		if(this.debug){
			alert(e);			
		}			
	}
}


	
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
