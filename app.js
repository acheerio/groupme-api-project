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
				req.session.img = userObj.image_url;
				req.session.name = userObj.name;
				req.session.user_id = userObj.id;
				req.session.email = userObj.email;
				req.session.phone = userObj.phone_number;
				req.session.lang = userObj.locale;
				
				// save to context
				context.img = req.session.img + "." + IMG_SIZE;
				context.name = req.session.name;
				context.id = req.session.user_id;
				context.email = req.session.email;
				context.phone = req.session.phone;
				context.lang = req.session.lang;
				
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
								"num_members": groups[i]["members"].length,
								"get_messages": false
							});
						}
						
						req.session.groups = myGroups;
						context.groups = req.session.groups;
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

app.post('/2', function(req, res) {
	var context = {};
	var groupIndex = null;
	
	// profile info
	context.img = req.session.img + "." + IMG_SIZE;
	context.name = req.session.name;
	context.id = req.session.user_id;
	context.email = req.session.email;
	context.phone = req.session.phone;
	context.lang = req.session.lang;
	
	// group info
	context.groups = req.session.groups;
	
	if (req.body["get_msgs"])
	{
		request.get({url: "https://api.groupme.com/v3/groups/" + req.body.group_id + "/messages?token=" + req.session.apiKey}, function(error, response, body)
		{
			if (!error && response.statusCode >= 200 && response.statusCode < 400)
			{
				// set getMessages to true
				for (var i = 0; i < req.session.groups.length; i++)
				{
					if (req.session.groups[i]["id"] == req.body.group_id)
					{
						groupIndex = i;
						req.session.groups[groupIndex]["get_messages"] = true;
						context.groups[groupIndex]["get_messages"] = true;
					}
				}
				
				// TESTING
				console.log("get_messages set to true");
				
				var msgArray = [];
				var rawMsgs = JSON.parse(body).response.messages;
				
				// messages are returned in descending order (newest first) so pushing in reverse
				for (var i = (rawMsgs.length - 1); i >= 0; i--)
				{
					msgArray.push({
						"username": rawMsgs[i]["name"],
						"text": rawMsgs[i]["text"],
						"timestamp": rawMsgs[i]["created_at"]
					});
				}
				
				// TESTING - 
				for (var i = 0; i < msgArray.length; i++)
				{
					console.log(msgArray[i]["username"], msgArray[i]["text"]);
				}
				
				// message info
				req.session.groups[groupIndex]["messages"] = msgArray;
				context.groups[groupIndex]["messages"] = req.session.groups[groupIndex]["messages"];
				
				res.render("2_demo", context);
			}
			else
			{
				// error
				res.status(response.statusCode);
			}
		});
	}
	
	if (req.body["send_msg"])
	{
		request.post({
			url: "https://api.groupme.com/v3/groups/" + req.body.group_id + "/messages?token=" + req.session.apiKey,
			headers: {"Content-Type": "application/json"
			body: '{}'}
			}, function(error, response, body)
			{
				if (!error && response.statusCode >= 200 && response.statusCode < 400)
				{
				}
				else
				{
				}
			}
		);
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