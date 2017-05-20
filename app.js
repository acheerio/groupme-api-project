var express = require('express');
var handlebars = require("express-handlebars").create({defaultLayout: "main"});
var session = require('express-session');
var request = require('request');
var bodyParser = require('body-parser');

// express
var app = express();

// session
app.use(session({secret: SESSION_SECRET}));

// handlebars
app.engine("handlebars", handlebars.engine);
app.set("view engine", "handlebars");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var API_KEY = "";
var SESSION_SECRET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

app.set('port', process.env.PORT || 3000);

app.get('/', function(req, res){
	res.render("home");
});

app.get('/about', function(req, res){
	res.render("about");
});

app.get('/2', function(req, res){
	res.render("2");
});

app.get('/3', function(req, res){
	res.render("3");
	apiKey = req.query.access_token;
});

app.get('/headers', function(req,res){
	res.set('Content-Type','text/plain');
	var s = '';
	for(var name in req.headers) s += name + ': ' + req.headers[name] + '\n';
	res.send(s);
});

app.get('/api', function(req, res){
	if (req.query.q == "user")
	{	
		var userObj = null;
		request.get({url: "https://api.groupme.com/v3/users/me?token=" + apiKey}, function(error, response, body)
			{
				if (!error && response.statusCode >= 200 && response.statusCode < 400)
				{
					userObj = JSON.parse(body).response;
				}
				res.json(userObj);
				res.status(response.statusCode);
			}
		);
	}
});

// custom 404 page
app.use(function(req, res){
	res.status(404);
	res.render("404");
});

// custom 500 page
app.use(function(err, req, res, next){
	console.error(err.stack);
	res.status(500);
	res.render("500");
});

app.listen(app.get('port'), function(){
	console.log( 'Express started on http://localhost:' +
	app.get('port') + '; press Ctrl-C to terminate.' );
});