/*eslint-env node, express, cfenv, express-session, watson-developer-cloud, body-parser */

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

console.log("Démarrage de l'application");
var express = require('express');
var cfenv = require('cfenv');
var session = require("express-session");
var app = express();
var bodyParser = require("body-parser");
var https = require("https");

// Environnement

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// Watson Services
var LanguageTranslatorV2 = require("watson-developer-cloud/language-translator/v2");
var language_translator;
var translatorService = appEnv.getService(/translator/i);
if (translatorService) {
	console.log("Initialisation du service à partir de Bluemix.");
	language_translator = new LanguageTranslatorV2({
  		username: translatorService.credentials.username,
	  	password: translatorService.credentials.password,
  		url: translatorService.credentials.url
	});
} else {
	console.log("Initialisation du service à partir d'une exécution locale.");
	language_translator = new LanguageTranslatorV2({
  		username: "8e7933a9-8cfe-4ff2-9c37-47401933cefe",
	  	password: "KtuvlKGmadBF",
  		url: 'https://gateway.watsonplatform.net/language-translator/api/'
	});
}

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

app.get("/meteo", function(request, response) {
	console.log("Demande ma météo pour " + request.query.latitude + ", " + request.query.longitude);
	var options = {
		host: "twcservice.mybluemix.net",
		method: "GET",
		path: "/api/weather/v1/geocode/" + request.query.latitude + "/" + request.query.longitude + "/observations.json?language=fr-FR&units=m",
		auth:"744fd58c-9555-4c34-8f86-a915f1651208:ibTP99RDM9"
	};

	https.get(options, function(httpsResponse) {
		var twcData = "";
		httpsResponse.on("data", function(chunck) {
			twcData += chunck;
		});
		httpsResponse.on("end", function() {
			var twcResponse = JSON.parse(twcData);

			var body = "Station d'observation: " + twcResponse.observation.obs_name + "\n";
			body += "Température: " + twcResponse.observation.temp + "°C" + "\n";
			body += "Pression: " + twcResponse.observation.pressure_desc + "\n";
			body += "Point de rosée: " + twcResponse.observation.dewPt + "°C" + "\n";
			body += "Humidité relative: " + twcResponse.observation.rh + "%" + "\n";
			body += "Pression: " + twcResponse.observation.pressure + " mb" + "\n";
			if (twcResponse.observation.vis == 999) {
				body += "Visibilité: maximale" + "\n";
			} else {
				body += "Visibilité: " + twcResponse.observation.vis + "\n";
			}

			response.set('Content-Type', 'text/plain');
			response.send(body);
			response.end();

		});
	});

});

/*
app.use(function(request, response) {
	console.log("Défaut : renvoi de la page de garde");
	response.render("index.ejs", {translatedText: ""});
});
*/

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
