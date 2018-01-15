 
 angularnodeApp.service('nameService', [function () {	
 
    var storedName = "";
	
	function setName(n){  storedName = n;}
	function getName(){return   storedName;}
	
	return {
		setName :  setName,
		getName : getName
	}
}]);