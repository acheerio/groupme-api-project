var express = require('express');
var handlebars = require("express-handlebars").create({defaultLayout: "main"});
var request = require('request');
var path = require('path');
var session = require('express-session');
var bodyParser = require('body-parser');

// constants
const SESSION_SECRET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MAX_MSGS = 20;
const IMG_SIZE = "preview"; // options (small to large): avatar, preview, large

// express
var app = express();

// express-session
app.use(session({ 
	secret: SESSION_SECRET,
	resave: false,
	saveUninitialized: true }));

// body-parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// handlebars
app.engine("handlebars", handlebars.engine);
app.set("view engine", "handlebars");
app.use(express.static(path.join(__dirname, '/public')));

app.set('port', process.env.PORT || 3000);

app.get('/', function(req, res){
	
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
				if (req.session.img)
					context.img = req.session.img + "." + IMG_SIZE;
				else
					context.img = null;
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
							if (groups[i]["image_url"])
								var myImgURL = groups[i]["image_url"] + "." + IMG_SIZE;
							else
								var myImgURL = null;
							myGroups.push({
								"img": myImgURL,
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
					// error requesting group data
					else
					{
						if (response)
						{
							res.status(response.statusCode);
							console.log(response.statusCode);
						}
						next(error);
					}
				});
			}
			// error requesting user data
			else
			{
				if (response)
				{
					res.status(response.statusCode);
					console.log(response.statusCode);
				}
				next(error);
			}
		});
	}
});

app.post('/', function(req, res) {
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
	
	if(req.body["disconnect"])
	{
        req.session.destroy();
		res.render("2_login", context);
	} 
	
	else if (req.body["get_msgs"])
	{
		request.get({url: "https://api.groupme.com/v3/groups/" + req.body.group_id + "/messages?token=" + req.session.apiKey}, function(error, response, body)
		{
			if (!error && response.statusCode >= 200 && response.statusCode < 400)
			{
				for (var i = 0; i < req.session.groups.length; i++)
				{
					if (req.session.groups[i]["id"] == req.body.group_id)
					{
						groupIndex = i;
						req.session.groups[groupIndex]["get_messages"] = true;
						context.groups[groupIndex]["get_messages"] = true;
					}
				}
				
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
				
				// message info
				req.session.groups[groupIndex]["messages"] = msgArray;
				context.groups[groupIndex]["messages"] = req.session.groups[groupIndex]["messages"];
				
				res.render("2_demo", context);
			}
			// error getting messages
			else
			{
				if (response)
				{
					res.status(response.statusCode);
					console.log(response.statusCode);
				}
				next(error);
			}
		});
	}
	
	else if (req.body["send_msg"])
	{
		request.post({
			url: "https://api.groupme.com/v3/groups/" + req.body.group_id + "/messages?token=" + req.session.apiKey,
			headers: {"Content-Type": "application/json"},
			body: JSON.stringify({"message": {"text": req.body.message}})}, function(error, response, body)
			{
				if (!error && response.statusCode >= 200 && response.statusCode < 400)
				{
					// find array index for group with specified id
					for (var i = 0; i < req.session.groups.length; i++)
					{
						if (req.session.groups[i]["id"] == req.body.group_id)
						{
							groupIndex = i;
							req.session.groups[groupIndex]["get_messages"] = true;
							context.groups[groupIndex]["get_messages"] = true;
						}
					}

					var thisMsg = JSON.parse(body).response.message;
					
					if ("messages" in req.session.groups[groupIndex]) // existing messages list, just get rid of top and bottom
					{
						if (req.session.groups[groupIndex]["messages"].length >= MAX_MSGS)
							req.session.groups[groupIndex]["messages"].shift();
						req.session.groups[groupIndex]["messages"].push({
							"username": thisMsg["name"],
							"text": thisMsg["text"],
							"timestamp": thisMsg["created_at"]});
					}
						
					// message info
					context.groups[groupIndex]["messages"] = req.session.groups[groupIndex]["messages"];
				
					res.render("2_demo", context);
				}
				else
				{
					res.status(response.statusCode);
				}
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