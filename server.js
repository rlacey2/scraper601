var express = require('express');
var path = require('path');
var fs = require('fs');  // for loading localhost test certs
var os = require('os');
var https = require('https'); 
var http  = require('http');  
var toobusy = require('toobusy-js');   // https://www.npmjs.com/package/toobusy-js

var platform = require('./node_server/platform.js').configure();
 

 
var app = express(); 

var scrape   = require('./routes/scrape');

app.enable('trust proxy'); // needed for req.secure for bluemix

// middleware which blocks requests when we're too busy 
app.use(function(req, res, next) {  // HAS TO BE FIRST 
  if (toobusy()) {
     res.status(503).send("<p><p>&nbsp&nbsp<h1>The server is busy, please try later, possibly in about 30 seconds.</h1>");
  } else {
       next();
  }
});




app.use (function (req, res, next) {  // req.protocol
        if (req.secure) {
                // request was via https, so do no special handling
                next();
        } else { // request was via http, so redirect to https
				console.log("redirecting from http to https");
				console.log('https://' + req.headers.host + req.url);
                res.redirect('https://' + req.headers.host + req.url);
        }
});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
 // res.header("Access-Control-Allow-Methods", "GET");  
  next();
});


 
app.use(   "/",  
			express.static(__dirname + '/_ngClient')    
);
 
app.use( // alias to third party js code etc
			"/js_thirdparty", //the URL throught which you want to access   content
			express.static(__dirname + '/js_thirdparty') 
);		
app.use( //  alias mapping
			"/node_modules", //the URL throught which you want to access   content
			express.static(__dirname + '/node_modules') 
);
/*
app.use( // alias to third party js code manged by bower
			"/bower_components", //the URL throught which you want to access   content
			express.static(__dirname + '/bower_components') 
);			
 */
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/_ngClient/index.html'));
});

// wire in routers to specific path prefixes
app.use('/scrape',  scrape);  

// all the server rest type route paths are mapped in index.js
//app.use('/', require('./routes')); // will load/use index.js by default from this folder

app.use(function(req, res, next) { // If no route is matched by now, it must be a 404
	console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%");
    var err = new Error('Route Not Found, are you using the correct http verb / is it defined?\n\n' + req.method + "\t" + req.path + "\n\n");
    err.status = 404;		 
    next(err);
});


if (platform.isLocalHost) { //was cfCore.isLocal
// openssl genrsa -out test-key.pem 1024 
// openssl req -new -key test-key.pem -out certrequest.csr
// openssl x509 -req -in certrequest.csr -signkey test-key.pem -out test-cert.pem	
	console.log("*** Using temp SSL keys on the nodejs server");
	var privateKey   = fs.readFileSync('ssl/test-key.pem');
	var certificate  = fs.readFileSync('ssl/test-cert.pem'); 

    var localCertOptions = {  // use local self-signed cert
        key: privateKey, 
        cert: certificate, 
        requestCert: false, 
        rejectUnauthorized: false 
    }; 		
		
    https.createServer (localCertOptions, app).listen (platform.port, function () { 
	   console.log(new Date().toISOString());
	   console.log(__dirname + '/_ngClient');
    }); 
 	
} else { // not local, its in the cloud somewhere, assuming cloud provides ssl certs

    if (platform.architecture === "bluemix") // could refactor next 2, leaving separate incase needed in future
	{
		app.listen(platform.port, function() {
		    console.log (platform.architecture + ' server startup port: ' + platform.port); 
		}); 
	}
	else 
		if (platform.architecture === "heroku")
	{ 
		app.listen(platform.port, function() {
		    console.log (platform.architecture + ' server startup port: ' + platform.port); 
		}); 			
	}		
}    