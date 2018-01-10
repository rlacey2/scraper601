var express = require('express');
var request = require('request');        // simple http calls
const axios = require('axios');          // promise based http calls
var cheerio = require('cheerio');        // server side jQuery
var crontab = require('node-crontab');
var Q = require('q'); // promises
var bodyParser = require('body-parser');  

var app = express();

// individual get paths for /ise and /ftse350 and then refactored to work generically with /scrap?exchange=ise ...

var exchanges = {   
					"ise" :  { exchange : "ise", currrency : "euro",	
						sourceSite	: "http://www.davy.ie", 
						url 		: "http://www.davy.ie/markets-and-share-prices/iseq", 
						details 	: "http://www.davy.ie/markets-and-share-prices/iseq"  , // to drill into the stock
						stock_selector : ".share_table tbody tr",  // to find for scrapping
						
						parse_stock : function($,stock)
						{
							detail = $($(stock.children().get(0)).children().get(0)).attr("href"); // tricky
							symbol = $($(stock.children().get(0)).children().get(0)).attr("href").split("=")[1];
							company = $(stock.children().get(0)).text().trim();  // from the <a />
							price = $(stock.children().get(1)).text().trim(); 
							change = $(stock.children().get(2)).text().trim(); 
							pChg = $(stock.children().get(3)).text().trim(); 

							return { company :   company, symbol : symbol, price : price , change : change, pChg : pChg, detail : detail};
						}
 								
					}, // ise
					
					
					"ftse350" :  { exchange : "ftse350", currrency : "sterling",	
						sourceSite	: "http://shares.telegraph.co.uk", 
						url 		: "http://shares.telegraph.co.uk/indices/?index=NMX", 
						details	 	: "http://shares.telegraph.co.uk"  , // to drill into the stock
						stock_selector : "table#summary-table tbody tr",  // to find for scrapping					
						
						parse_stock : function($,stock)
						{
							detail = $($(stock.children().get(0)).children().get(0)).attr("href"); // tricky
							symbol = $($(stock.children().get(0)).children().get(0)).attr("href").split("=")[1];
							company = $(stock.children().get(1)).text().trim(); 
							price = $(stock.children().get(2)).text().trim(); 
							change = $(stock.children().get(3)).text().trim(); 
							pChg = $(stock.children().get(4)).text().trim(); 

							return { company :   company, symbol : symbol, price : price , change : change, pChg : pChg, detail : detail};
						}
 								
					}, // fts350					
 					
					
				};


// in this solution all dat is cached for 5 minutes, to prevent scraping hits placing undo burden on third party site.
// for real application this can be handled with an agreement and/or fee etc.

var cache = {};

var jobId = crontab.scheduleJob("*/5 * * * *", function() { //This will call this function every 5 minutes 
    console.log("Clearing cache: " + new Date().toISOString());
	cache = {};
 // not working as next login fails for some reason	secrets.jwtSetSecret();
});

function scrap_data(options, res){ // deprecated
  var deferred = Q.defer();
  console.log(options);
 
  var data = [];
  var results = { exchange : options.exchange, source: options.sourceSite, time : new Date(), cached : false, details : options.details, data: []};
 
  request(options.url, function(error, response, html){
	if ( error)
	{
		results.error = error
		res.status(404);	
		res.json(results);
		return;
	}
	
    if(!error){ // redundant 
      var $ = cheerio.load(html);
 
      var company, price, change, pChg, symbol, detail;
      var json;
      // valid parse 10/01/2018
      $(options.stock_selector).filter(function(){ // for each !!!!! i.e. get each share which is in a row / tr
        var stock = $(this);
		json = options.parse_stock($,stock);
		json.currency = options.currency
        data.push(json);
      });
    }
 
	results.data = data;
	cache[options.exchange] = results;
	res.status(200);	
	res.json(results);
 
  });
 
}; // scrap_data

function scrape_companies($,options) {
	    var data = [];

		$(options.stock_selector).filter(function(){ // for each !!!!! i.e. get each share which is in a row / tr
		
			var stock = $(this);
			json = options.parse_stock($,stock);
			json.currency = options.currency
			data.push(json);
		  });	
console.log(data);		  
		  return data;
} // scrape_companies
 
app.get('/', function(req, res){  //  

    var temp = "";
	temp = temp + "<a href='/scrapeall'>/scrapeall</a><br>";
 	temp = temp + "<a href='/scrape?exchange=ise'>/scrape?exchange=ise</a><br>";
 	temp = temp + "<a href='/scrape?exchange=ftse350'>/scrape?exchange=ftse350</a><br>";
	
	temp = temp + "<a href='/ise'>/ise</a><br>";
	temp = temp + "<a href='/ftse350'>/ftse350</a><br>";
	res.status(200);	
	res.send(temp);

});
 
 
app.get('/scrape', function(req, res){  // as /scrape?exchange=ise    /scrape?exchange=ftse350
	
	var exchange = req.query.exchange ; // use as a key into exhanges
	
	var options = exchanges[exchange];
	
  	if (cache[options.exchange]) 
	{   
			res.status(200);	
			cache[options.exchange].cached = true;
			res.json(cache[options.exchange]);	
			return;
	}	

	var data = [];
	var results = { exchange : options.exchange, source: options.sourceSite, time : new Date(), cached : false, details : options.details, data: []};
 	
	axios.get(options.url)
	  .then(response => {
		var $ = cheerio.load(response.data);
	
		  // valid parse 10/01/2018

		results.data = scrape_companies($,options);
		cache[options.exchange] = results;
		res.status(200);	
		res.json(results);
	  })
	  .catch(error => {
		results.error = error
		res.status(404);	
		res.json(results);
		return;	
	  });	
}); // /scrap


app.get('/scrapeall', function(req, res){  // as /scrapall

	var data = [];
	var results = {};
	
  	if (cache["all"]) 
	{   
			res.status(200);	
			cache["all"][0].cached = true;
			cache["all"][1].cached = true;			
			res.json(cache["all"]);	
			return;
	}		
 
	var options;
	options = exchanges["ise"];
	results.ise     =  { exchange : options.exchange, source: options.sourceSite, time : new Date(), cached : false, details : options.details, data: []};
	options = exchanges["ftse350"];
	results.ftse350 = { exchange : options.exchange, source: options.sourceSite, time : new Date(), cached : false, details : options.details, data: []};
 
	axios.all([   axios.get(exchanges['ise'].url),   axios.get(exchanges['ftse350'].url)])
	  .then(axios.spread(function (R_ise, R_ftse350) {
		// all requests are now complete
		
			var $ = cheerio.load(R_ise.data);
	        $ = cheerio.load(R_ise.data);
		  // valid parse 10/01/2018
			results.ise.data =  scrape_companies($,exchanges["ise"]); 
			$ = cheerio.load(R_ftse350.data);
			results.ftse350.data =  scrape_companies($,exchanges["ftse350"]); 	
 
			cache["all"] = results;
			res.status(200);	
			res.json(results);		
 
	  })).catch(error => {
		console.log( error );
		res.status(404);	
		res.json([]);
			});
});


// this is the intial code that gets refactored to become /scrape
app.get('/ise', function(req, res){ // using  http://www.davy.ie/markets-and-share-prices/iseq 
	
	var exchange = "ise";
	var sourceSite =  "davy";
	var currency = "euro";
	var details = "http://www.davy.ie/markets-and-share-prices/iseq"; // prefix for a specific share

  	if (cache[exchange]) 
	{   
			res.status(200);	
			cache[exchange].cached = true;
			res.json(cache[exchange]);	
			return;
	}
	
  // Let's scrape  
  url = 'http://www.davy.ie/markets-and-share-prices/iseq';

  // ise does pagination so two queries?
  var data = [];
  var results = { exchange : exchange, source: sourceSite, time : new Date(), cached : false, details : details, data: []};
  

  request(url, function(error, response, html){
	if ( error)
	{
		results.error = error
		res.status(404);	
		res.json(results);
		return;
	}
	
    if(!error){ // redundant 
      var $ = cheerio.load(html);
 
      var company, price, change, pChg, symbol, detail;
      var json;
      // valid parse 10/01/2018
      $('.share_table tbody tr').filter(function(){ // for each !!!!! i.e. get each share which is in a row / tr
        var stock = $(this);
 
		detail = $($(stock.children().get(0)).children().get(0)).attr("href"); // tricky
	    symbol = $($(stock.children().get(0)).children().get(0)).attr("href").split("=")[1];
		company = $(stock.children().get(0)).text().trim();  // from the <a />
		price = $(stock.children().get(1)).text().trim(); 
		change = $(stock.children().get(2)).text().trim(); 
		pChg = $(stock.children().get(3)).text().trim(); 

        json = { company :   company, symbol : symbol, price : price , change : change, pChg : pChg, detail : detail, currency : currency};
 
        data.push(json);
      });
    }


	results.data = data;
	cache[exchange] = results;
	res.status(200);	
	res.json(results);
 
  })
});

// this is the intial code that gets refactored to become /scrape
app.get('/ftse350', function(req, res){ // http://shares.telegraph.co.uk/indices/?index=NMX = FTSE350

	var exchange = "ftse350";
	var sourceSite = "telegraph";
	var currency = "sterling";
	var details = "http://shares.telegraph.co.uk"; // prefix for a specific share	
	
  	if (cache.ftse350) 
	{   
			res.status(200);	
			cache.ftse350.cached = true;
			res.json(cache.ftse350);	
			return;
	}
	
  // Let's scrape  
  url = 'http://shares.telegraph.co.uk/indices/?index=NMX';

  // ise does pagination so two queries?
  var data = [];
  var results = { exchange : exchange, source: sourceSite, time : new Date(), cached : false, details : details, data: []};
 
  request(url, function(error, response, html){
	  
	if ( error)
	{
		results.error = error
		res.status(404);	
		res.json(results);
		return;
	}
	
    if(!error){ // redundant 
      var $ = cheerio.load(html);
 
      var company, price, change, pChg, symbol, detail;
      var json;
      // valid parse 10/01/2018
      $('table#summary-table tbody tr').filter(function(){ // for each !!!!! i.e. get each share which is in a row / tr
        var stock = $(this);
		 
		 
		detail = $($(stock.children().get(0)).children().get(0)).attr("href"); // tricky
	    symbol = $($(stock.children().get(0)).children().get(0)).attr("href").split("=")[1];
	 	company = $(stock.children().get(1)).text().trim(); 
	 	price = $(stock.children().get(2)).text().trim(); 
	 	change = $(stock.children().get(3)).text().trim(); 
	 	pChg = $(stock.children().get(4)).text().trim(); 
 
        json = { company :   company, symbol : symbol, price : price , change : change, pChg : pChg, detail : detail, currency : currency};
 
        data.push(json);
      });
    }
	
	//console.log(results);
	//console.log(results.length);

	results.data = data;
	cache[exchange] = results;
	res.status(200);	
	res.json(results);
 
  })
});


app.listen('8081')
console.log('using port 8081');
