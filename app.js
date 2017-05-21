var express = require('express');
var handlebars = require("express-handlebars").create({defaultLayout: "main"});
var session = require('express-session');
var request = require('request');
var bodyParser = require('body-parser');

// express
var app = express();

// express-session
var SESSION_SECRET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
app.use(session({ 
	secret: SESSION_SECRET,
	resave: false,
	saveUninitialized: true }));

// handlebars
app.engine("handlebars", handlebars.engine);
app.set("view engine", "handlebars");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.set('port', process.env.PORT || 3000);

var IMG_SIZE = "avatar"; // options (small to large): avatar, preview, large

app.get('/', function(req, res){
	res.render("home");
});

app.get('/about', function(req, res){
	res.render("about");
});

app.get('/2', function(req, res){
	
	// get the user's API key from URL
	req.session.apiKey = req.query.access_token || "";	
	
	// if the user is not connected, prompt to connect to GroupMe
	if (req.session.apiKey == "")
	{
		res.render("2_login");
	}
	// if the user IS connected, fetch data with valid API key
	else
	{
		var context = {};
		
		// request user data
		request.get({url: "https://api.groupme.com/v3/users/me?token=" + req.session.apiKey}, function(error, response, body)
		{
			if (!error && response.statusCode >= 200 && response.statusCode < 400)
			{
				var userObj = JSON.parse(body).response;
				// save to session
				req.session.img = userObj.image_url; // to show avatar
				req.session.name = userObj.name; // to show personalized greeting
				// save to context
				context.img = req.session.img + "." + IMG_SIZE;
				context.name = req.session.name;
				context.id = userObj.id;
				context.email = userObj.email;
				context.phone = userObj.phone_number;
				context.lang = userObj.locale;
				
				// request group data
				request.get({url: "https://api.groupme.com/v3/groups?token=" + req.session.apiKey}, function(error, response, body)
				{
					if (!error && response.statusCode >= 200 && response.statusCode < 400)
					{
						var myGroups = [];
						var groups = JSON.parse(body).response;
						for (var i = 0; i < groups.length; i++)
						{
							myGroups.push({
								"img": groups[i]["image_url"] + "." + IMG_SIZE,
								"name": groups[i]["name"],
								"id": groups[i]["id"],
								"privacy": groups[i]["type"],
								"num_members": groups[i]["members"].length
							});
						}
						context.groups = myGroups;
						res.render("2_demo", context);
					}
					else
					{
						// error
						res.status(response.statusCode);
					}
				});
			}
			else
			{
				// action if error
				res.status(response.statusCode);
			}
		});
	}
});

/*
app.get('/headers', function(req,res){
	res.set('Content-Type','text/plain');
	var s = '';
	for(var name in req.headers) s += name + ': ' + req.headers[name] + '\n';
	res.send(s);
});
*/

/*
app.get('/api', function(req, res){
	if (req.body.command === "disconnect")
	{
		req.session.destroy();
	}
	// need "else error"?
	
	if (req.query.q == "user")
	{	
		var userObj = null;
		request.get({url: "https://api.groupme.com/v3/users/me?token=" + req.session.apiKey}, function(error, response, body)
			{
				if (!error && response.statusCode >= 200 && response.statusCode < 400)
				{
					userObj = JSON.parse(body).response;
					console.log(userObj); // testing
				}
				res.json(userObj);
				res.status(response.statusCode);
			}
		);
	}
});*/

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