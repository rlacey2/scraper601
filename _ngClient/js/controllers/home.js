 
angularnodeApp.controller('HomeCtrl', ['$scope' , 'nrzLightify',  
		function($scope, nrzLightify  ) {
 
			nrzLightify({
					type: 'info',
					text: "Home Page" 
 
				}, 3000);			
 	
		}]); // HomeCtrl
	
 
 	
	 