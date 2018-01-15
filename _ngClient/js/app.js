var angularnodeApp = angular.module("angularnodeApp", // may be easier to maintain dependencies this way
		['ngRoute', 
		'ngResource', 
		'nrzLightify', 
		'angular-cookie-law', 
		'ui.bootstrap' ]);
  

angularnodeApp.config(['$routeProvider','$httpProvider', '$provide',  '$locationProvider',
      function($routeProvider, $httpProvider, $provide,  $locationProvider ) {
// You can not ask for instance during configuration phase - you can ask only for providers.	 
console.log("angularnodeApp.config")	  // runs once only
 $locationProvider.hashPrefix(''); // prevents #! with Angular 1.6.x
//  Force AngularJS to call our JSON Web Service with a 'GET' rather than an 'OPTION' 
//  Taken from: http://better-inter.net/enabling-cors-in-angular-js/	  
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];	  
		
			$routeProvider.					
					  when('/home', {
						templateUrl: './partials/home.html',
						controller: 'HomeCtrl'
					  }).												  
					  when('/tests', {
						templateUrl: './partials/tests.html',
						controller: 'TestsCtrl'
					  }).						  
					  when('/about', {
						templateUrl: './partials/about.html',
						controller: 'AboutCtrl'
					  }).	 	 
						when('/recaptcha', {
						templateUrl: './partials/recaptcha.html',
						controller: 'recaptchaCtrl'
					  }).						
					  otherwise({
						redirectTo: '/home'
					  });
  }]);