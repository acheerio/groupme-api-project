var express = require('express');
var request = require('request');
var app = express();
var apiKey = "";

// handlebars
var handlebars = require("express-handlebars").create({defaultLayout: "main"});
app.engine("handlebars", handlebars.engine);
app.set("view engine", "handlebars");

app.set('port', process.env.PORT || 3000);

app.get('/', function(req, res){
	res.render("home");
});

app.get('/about', function(req, res){
	res.render("about");
});

app.get('/page3', function(req, res){
	res.render("page3");
});

app.get('/page4', function(req, res){
	res.render("page4");
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