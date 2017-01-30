/*eslint-env node, express, cfenv, express-session, watson-developer-cloud*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

var express = require('express');
var cfenv = require('cfenv');
var session = require("express-session");
var app = express();
var bodyParser = require("body-parser")

// Watson Services
var LanguageTranslatorV2 = require("watson-developer-cloud/language-translator/v2");
var language_translator = new LanguageTranslatorV2({
  username: "8e7933a9-8cfe-4ff2-9c37-47401933cefe",
  password: "KtuvlKGmadBF",
  url: 'https://gateway.watsonplatform.net/language-translator/api/'
});

var urlencodedParser = bodyParser.urlencoded({ extended: false })

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// Initialiser la session
app.use(session({ secret : "edfxphn",
                  resave : false,
                  saveUninitialized : true
                }));

// Program
app.get("/", function(request, response) {
	console.log("Get / :" + request.session.translatedText);
	if (request.session.translatedText) {
		console.log("   translatedText défini. renvoi du formulaire renseigné");
		response.render("index.ejs", {translatedText: request.session.translatedText});
	} else {
		console.log("   translatedText non défini. renvoi du formulaire vide");
		response.render("index.ejs", {translatedText: ""});
	}
});

app.post("/translate", urlencodedParser, function(request, response) {
	console.log("POST /translate : " + request.body.toTranslateText);
	language_translator.translate({
  			text: request.body.toTranslateText,
  			source : "fr",
  			target: "en"
  		},
		function (err, translation) {
  		  if (err) {
  		  	console.log("   Translation error: " + err);
  		  	request.session.translatedText = err;
  		  } else {
      		/* request.session.translatedText = JSON.stringify(translation, null, 2); */
      		request.session.translatedText = translation.translations[0].translation;
  		  	console.log("   Translation: " + request.session.translatedText);
      	  }

      	  console.log("Redirection vers /");
	      response.redirect("/");

      	});
});

/*
app.use(function(request, response) {
	console.log("Défaut : renvoi de la page de garde");
	response.render("index.ejs", {translatedText: ""});
});
*/

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});

console.log("appEnv : " + JSON.stringify(appEnv, null, 2));
