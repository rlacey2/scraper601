angularnodeApp.controller('TestsCtrl', ['$scope', '$http', '$q',  
  function($scope, $http, $q) {
	  
	  
    function get(options)
	{
			var deferred = $q.defer();
		
			$http.get(options.route).then(function(response) {
			  
					deferred.resolve(response );
					}, function(error) {
			  
						deferred.reject(error);
				});
			return deferred.promise;		
		
	} 	 // get	
	
	
	$scope.tests = [];

	$scope.testData = {};
	
	// refactor in real-life
	var getOptions
    getOptions = {}; 
	getOptions.route = "/scrape/test?n=1";    
 	get(getOptions).then(function(R) {   
							$scope.testData = R.data;	 
							$scope.tests[0] =  R.data ;
						}, function(error) {
						   $scope.testData = {};						   
						});	
	  
    getOptions = {}; 
	getOptions.route = "/scrape/test?n=2";    
 	get(getOptions).then(function(R) {   
							$scope.testData = R.data;	 
							$scope.tests[1] =  R.data ;
						}, function(error) {
						   $scope.testData = {};					   
						});	
	  
    getOptions = {}; 
	getOptions.route = "/scrape/test?n=3";    
 	get(getOptions).then(function(R) {   
							$scope.testData = R.data;	 
							$scope.tests[2] =  R.data ;
						}, function(error) {
						   $scope.testData = {};					   
						});	
 
    getOptions = {}; 
	getOptions.route = "/scrape/test?n=4";    
 	get(getOptions).then(function(R) {   
							$scope.testData = R.data;	 
							$scope.tests[3] =  R.data ;
						}, function(error) {
						   $scope.testData = {};					   
						});	
						
    getOptions = {}; 
	getOptions.route = "/scrape/test?n=5";    
 	get(getOptions).then(function(R) {   
							$scope.testData = R.data;	 
							$scope.tests[4] =  R.data ;
						}, function(error) {
						   $scope.testData = {};					   
						});							
 
 
  }]); // TestCtrl	