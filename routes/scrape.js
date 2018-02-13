// router to handle http paths   /scrape/*      /scrape is handled in server.js

var express = require('express');

var router = express.Router();

var express = require('express');
var request = require('request');        // simple http calls
var axios = require('axios');          // promise based http calls
var cheerio = require('cheerio');        // server side jQuery
var crontab = require('node-crontab');
var Q = require('q'); // promises
var bodyParser = require('body-parser');  

var testData = require('./testData.js');

// individual get paths for /ise and /ftse350 and then refactored to work generically with /scrap?exchange=ise ...

// https://coinmarketcap.com may be easier to parse for cryptos

var exchanges = {   
					"ise" :  { exchange : "ise", currency : "euro",	
						sourceSite	: "http://www.davy.ie", 
						url 		: "http://www.davy.ie/markets-and-share-prices/iseq", 
						details 	: "http://www.davy.ie/markets-and-share-prices/iseq/detail?ric=", // needs symbol appended
						stock_selector : ".share_table tbody tr",  // to find for scrapping
						
						parse_stock : function($,stock)
						{
							//detail = $($(stock.children().get(0)).children().get(0)).attr("href"); // tricky
							symbol = $($(stock.children().get(0)).children().get(0)).attr("href").split("=")[1].replace(".","_");
							company = $(stock.children().get(0)).text().trim();  // from the <a />
							price = $(stock.children().get(1)).text().trim(); 
							change = $(stock.children().get(2)).text().trim(); 
							pChg = $(stock.children().get(3)).text().trim(); 

							return { company :   company, symbol : symbol, price : price , change : change, pChg : pChg};
						}
 								
					}, // ise
									
					"ftse350" :  { exchange : "ftse350", currency : "sterling",	
						sourceSite	: "http://shares.telegraph.co.uk", 
						url 		: "http://shares.telegraph.co.uk/indices/?index=NMX", 
						details	 	: "http://shares.telegraph.co.uk/quote/?epic="  , // to drill into the stock
						stock_selector : "table#summary-table tbody tr",  // to find for scrapping					
						
						parse_stock : function($,stock)
						{
							detail = $($(stock.children().get(0)).children().get(0)).attr("href"); // tricky
							symbol = $($(stock.children().get(0)).children().get(0)).attr("href").split("=")[1].replace(".","_");;
							company = $(stock.children().get(1)).text().trim(); 
							price = $(stock.children().get(2)).text().trim(); 
							change = $(stock.children().get(3)).text().trim(); 
							pChg = $(stock.children().get(4)).text().trim(); 

							return { company :   company, symbol : symbol, price : price , change : change, pChg : pChg};
						}
 								
					}, // fts350					
 					
					"coinranking" :  { exchange : "coinranking", currency : "dollar",	
						sourceSite	: "https://coinranking.com", 
						url 		: "https://coinranking.com", 
						details 	: "https://coinranking.com/coin/"  , // to drill into the stock
						//stock_selector : ".coin-list__body__row  .grid",  // to find for scrapping
						stock_selector : "a.coin-list__body__row",  // to find for scrapping

						
						
						parse_stock : function($,stock)
						{
 
							detail = $(stock).attr("href").replace("https://coinranking.com",""); ;  //$($(stock.parent().parent())).attr("href").replace("https://coinranking.com","");			 
							symbol = 	$(stock).attr("href").replace("https://coinranking.com/coin/","").replace(".","_"); 
 							company =   $(stock.find(".coin-name")).text();  
							price =     $(stock.find(".coin-list__body__row__price__value")).text().trim().replace(",","");;   
							
							pChg =      $(stock.find(".coin-list__body__row__change")).text().trim(); 
							var pChg2 = parseFloat(pChg) / 100;
	
							// check if negative change 
							if ( $(stock.find(".coin-list__body__row__change")).hasClass("coin-list__body__row__change--negative") )
							{
								pChg = "-" + pChg;
								sign = -1;   // notice the signs for the calulations to calulcate change later
							}
							else
							{
								sign = +1;
							}
							// need to specific chancge to be consistent with other stock values
                            pValue = price / (1	+ ( pChg2 * sign))	 					
							 
							change =  (pValue - price).toFixed(2) * sign * -1;

							return { company :   company, symbol : symbol, price : price , change : change, pChg : pChg};
						}
 								
					} // coinranking
	
				};

// in this solution all dat is cached for 5 minutes, to prevent scraping hits placing undo burden on third party site.
// for real application this can be handled with an agreement and/or fee etc.

var cache = {};

var jobId = crontab.scheduleJob("*/5 * * * *", function() { //This will call this function every 5 minutes 
    console.log("Clearing cache: " + new Date().toISOString());
	cache = {};
 // not working as next login fails for some reason	secrets.jwtSetSecret();
});

function get_asset_object(data, asset,res) {
			var obj = data.find(o => o.symbol === asset);
            if (obj) {
				res.status(200);	
				res.json(obj);
				return;
			}
			else  { // not on this exchange
				res.status(404);	
				res.json({});
				return;
			}	
}

function scrape_companies($,options) {  // companies = stock of company, cryto currency i.e. something tradeable
	    var data = [];
 
		$(options.stock_selector).filter(function(){ // for each !!!!! i.e. get each share which is in a row / tr
 	
			var stock = $(this);
			json = options.parse_stock($,stock);
			data.push(json);
		  });		  
		  return data;
} // scrape_companies
 
router.get('/', function(req, res){  // as /scrape?exchange=ise    /scrape?exchange=ftse350     /scrape?exchange=coinranking
	
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

router.get('/assets/:exchange/:asset', function(req, res){  // as /scrape/some exchange/some asset returns object for on share only

	var exchange = req.params.exchange;
	var asset = req.params.asset;
 
  	if (cache[exchange]) {  
            // need to search the array of data
			

			get_asset_object(cache[exchange].data, asset, res);			
			/*
			var data = cache[exchange].data;
 
			var obj = data.find(o => o.symbol === asset);
            if (obj)
			{
				res.status(200);	
				res.json(obj);
				return;
			}
			else // not on this exchange
			{
				res.status(404);	
				res.json({});
				return;
			}	
*/			
	}	
	
	// do a fresh requery
			
	var options = exchanges[exchange];
 
	var data = [];
	var results = { exchange : options.exchange, source: options.sourceSite, time : new Date(), cached : false, details : options.details, data: []};
 	
	axios.get(options.url)
	  .then(response => {
		var $ = cheerio.load(response.data);
 
			results.data = scrape_companies($,options);

			cache[exchange] = results;
			cache[exchange].cached = true;			

			get_asset_object(cache[exchange].data, asset, res);
			/*
            // need to search the array of data
			var data = cache[exchange].data;
 
			var obj = data.find(o => o.symbol === asset);
            if (obj) {
				res.status(200);	
				res.json(obj);
				return;
			}
			else  { // not on this exchange
				res.status(404);	
				res.json({});
				return;
			}	
			*/			
	  })
	  .catch(error => {
		results.error = error
		res.status(404);	
		res.json(results);
		return;	
	  });
});

router.get('/all', function(req, res){  // as /scrape/all  object with data for 3 exchanges

	var data = [];
	var results = {};
	
  	if (cache["all"]) 
	{   
			res.status(200);	
			cache["all"].ise.cached = true;
			cache["all"].ftse350.cached = true;			
			cache["all"].coinranking.cached = true;				
			res.json(cache["all"]);	
			return;
	}		
 
	var options;   // exercise refactor below to a loop, to allow for scale
	options = exchanges["ise"];
	results.ise     =  { exchange : options.exchange, source: options.sourceSite, time : new Date(), cached : false, details : options.details, data: []};
	options = exchanges["ftse350"];
	results.ftse350 = { exchange : options.exchange, source: options.sourceSite, time : new Date(), cached : false, details : options.details, data: []};
	options = exchanges["coinranking"];
	results.coinranking = { exchange : options.exchange, source: options.sourceSite, time : new Date(), cached : false, details : options.details, data: []};

	var $; 
	axios.all([   axios.get(exchanges['ise'].url), axios.get(exchanges['ftse350'].url), axios.get(exchanges['coinranking'].url)])
	  .then(axios.spread(function (R_ise, R_ftse350, R_coinranking) {
		// all requests are now complete
		
	 
	        $ = cheerio.load(R_ise.data);	//.data is the html	
			results.ise.data =  scrape_companies($,exchanges["ise"]); 
			$ = cheerio.load(R_ftse350.data);
			results.ftse350.data =  scrape_companies($,exchanges["ftse350"]); 	
			$ = cheerio.load(R_coinranking.data);
			results.coinranking.data =  scrape_companies($,exchanges["coinranking"]); 			
 
			cache["all"] = results;
			res.status(200);	
			res.json(results);		
 
	  })).catch(error => {
		console.log( error );
		res.status(404);	
		res.json([]);
			});
});

router.get('/test', function(req, res){  // as /scrape/test?n=0 , 1,2,3,4,5     test cases for the stocks

	var n = req.query.n || 1 ;
	
	//n = n -1; // humans use 1..5
	var data = [];
	var results = {};
 
		res.status(200);	
		res.json(testData[n]);		
			
});


// this code below, does not scale well, if lots of sources
// this is the intial code that gets refactored to become /scrape
router.get('/ise', function(req, res){ // using  http://www.davy.ie/markets-and-share-prices/iseq 
	
	var exchange = "ise";
	var sourceSite =  "davy";
	var currency = "euro";
	var details = "http://www.davy.ie/markets-and-share-prices/iseq/detail?ric="; // prefix for a specific share
	var url = 'http://www.davy.ie/markets-and-share-prices/iseq';   // www.ise.ie uses pagination so two+ queries so not used as source, get from davy

  	if (cache[exchange]) 
	{   
			res.status(200);	
			cache[exchange].cached = true;
			res.json(cache[exchange]);	
			return;
	}
 
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

        json = { company :   company, symbol : symbol, price : price , change : change, pChg : pChg, };
 
        data.push(json);
      });
    }

	results.data = data;
	cache[exchange] = results;
	res.status(200);	
	res.json(results);
  })
});

router.get('/ftse350', function(req, res){ // http://shares.telegraph.co.uk/indices/?index=NMX = FTSE350

	var exchange = "ftse350";
	var sourceSite = "telegraph";
	var currency = "sterling";
	var details = "http://shares.telegraph.co.uk/quote/?epic="; // prefix for a specific share	
	var url = 'http://shares.telegraph.co.uk/indices/?index=NMX';	
	
  	if (cache.ftse350) 
	{   
			res.status(200);	
			cache.ftse350.cached = true;
			res.json(cache.ftse350);	
			return;
	}
 
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
 
        json = { company :   company, symbol : symbol, price : price , change : change, pChg : pChg, };
 
        data.push(json);
      });
    }

	results.data = data;
	cache[exchange] = results;
	res.status(200);	
	res.json(results);
  })
});

router.get('/coinranking', function(req, res){  

	var exchange = "coinranking";
	var sourceSite = "coinranking";
	var currency = "dollar";
	var details = "https://coinranking.com/coin/"; // prefix for a specific share	
	var url = 'https://coinranking.com/';
	
  	if (cache.coinranking) 
	{   
			res.status(200);	
			cache.coinranking.cached = true;
			res.json(cache.coinranking);	
			return;
	}
 
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
      $('.coin-list__body__row  .grid').filter(function(){ // for each !!!!! i.e. get each share which is in a row / tr
        var stock = $(this);
		 
							detail = $($(stock.parent().parent())).attr("href").replace("https://coinranking.com","");			 
							symbol = 	$($(stock.parent().parent())).attr("href").replace("https://coinranking.com/coin/",""); 
 							company =   $(stock.find(".coin-name")).text();  
							price =     $(stock.find(".coin-list__body__row__price__value")).text().trim().replace(",","");;   
							
							pChg =      $(stock.find(".coin-list__body__row__change")).text().trim(); 
							var pChg2 = parseFloat(pChg) / 100;
	
							// check if negative change 
							if ( $(stock.find(".coin-list__body__row__change")).hasClass("coin-list__body__row__change--negative") )
							{
								pChg = "-" + pChg;
								sign = -1;   // notice the signs for the calulations to calulcate change later
							}
							else
							{
								sign = +1;
							}
							// need to specific chancge to be consistent with other stock values
                            pValue = price / (1	+ ( pChg2 * sign))	 					
							 
							change =  (pValue - price).toFixed(2) * sign * -1;
 
        json = { company :   company, symbol : symbol, price : price , change : change, pChg : pChg, };
 
        data.push(json);
      });
    }

	results.data = data;
	cache[exchange] = results;
	res.status(200);	
	res.json(results);
  })
});



module.exports = router; // finally export the router that handles the routes