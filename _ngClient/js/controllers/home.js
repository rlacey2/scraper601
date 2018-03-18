 
angularnodeApp.controller('HomeCtrl', ['$scope' , 'nrzLightify',  
		function($scope, nrzLightify  ) {
 
			nrzLightify({
					type: 'info',
					text: "Home Page" 
 
				}, 3000);	




// 2-180318 QUICK FIX  USED WAYBACK MACHINE IN THE END

/*

		$.ajax({ url: 'https://shareprices.com/indices/ftse350', 
				crossDomain: true,
				dataType: 'jsonp',
				success: function(data) { alert("data"); },
				error: function(data) { 
				        console.log(data.error);
						alert("error"); }
				});

*/






				
 	
		}]); // HomeCtrl
	
 
 	
	 