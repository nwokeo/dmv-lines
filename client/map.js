var map;
var geocoder;
var bounds = new google.maps.LatLngBounds();
var markersArray = [];

//TODO: get this from geo IP
var origin = '90026'; //default origin

//var olddestinations = [];
var destinations = [];
var destAddrs = [];
var destCoords = [];
var times = [];
var officeUrl ='https://dmv-obiike.c9.io/dmv-lines/offices.json?callback=abc123' //TODO: retrieve from API (v2)
$.ajax({
  url: officeUrl,
  dataType: "jsonp",
  jsonpCallback: "abc123", /* Unique function name */
  success: function(json){
    for (office in json) {
      destinations.push( { 'address':json[office].address, 'coords':[parseFloat(json[office].coords[0]), parseFloat(json[office].coords[1])] } ); 
      times.push(json[office].nonAppt);
    } 
  }
});

Number.prototype.toRadians = function() {
  return this * Math.PI / 180;
}


function callHaversine(origin){
  haversineTest(origin,destinations);
}

//only look at 25 closest DMV offices
function haversineTest(origin, destinations){ //arr, object

  
  codeAddress(origin, function(locationData) {
    destAddrs = [];
    //geocode origin
    originCoords = [ locationData.geometry.location.k, locationData.geometry.location.D ] ;
    
    //calculate distances
    for (i in destinations) {
      var R = 6371000; // earth's radius in metres
      var φ1 = originCoords[0].toRadians();
      var φ2 = destinations[i].coords[0].toRadians();
      var Δφ = (destinations[i].coords[0]-originCoords[0]).toRadians();
      var Δλ = (destinations[i].coords[1]-originCoords[1]).toRadians();
      
      var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      
      var d = R * c;
      
      destinations[i].dist = d;
   }

    function compare(a,b) {
      if ( a.dist < b.dist )
        return -1;
      if ( a.dist > b.dist )
        return 1;
      return 0;
    }
    
    //order by proximity to origin (d)
    destinations.sort(compare);
	  //keep 25 closest
	  destinations = destinations.slice(0,20);

	  for (i in destinations){
	    destAddrs.push(destinations[i].address);
	  }

	  calculateDistances(origin);
  });  

}

//only need to geocode origin here.
function codeAddress(address, callback) {
  geocoder = new google.maps.Geocoder();
  if( geocoder ) {
    geocoder.geocode({ 'address': address }, function (results, status) {
      if( status == google.maps.GeocoderStatus.OK ) {
        callback(results[0]);
      }
    });
  }
}

var destinationIcon = 'https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=D|FF0000|000000'; //TODO: dynamic naming
var originIcon = 'https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=O|FFFF00|000000';

function initialize() {
  var opts = {
    center: new google.maps.LatLng(34.078732, -118.262448), //dynamic?
    zoom: 10
  };
  map = new google.maps.Map(document.getElementById('map-canvas'), opts);
  geocoder = new google.maps.Geocoder();
}

function calculateDistances(origin) {
  var service = new google.maps.DistanceMatrixService();
  service.getDistanceMatrix(
    {
      origins: [origin],
      destinations: destAddrs, //array of addresses
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.IMPERIAL, //or METRIC
      avoidHighways: false,
      avoidTolls: false
    }, callback);
}

function callback(response, status) {
  if (status != google.maps.DistanceMatrixStatus.OK) {
    alert('Error was: ' + status);
  } else {

    var origins = response.originAddresses;
    var destinations = response.destinationAddresses;
    var outputDiv = document.getElementById('outputDiv');
    deleteOverlays();
    
    for (var i = 0; i < origins.length; i++) {
      //build one array per origin, one object per destination
      originResults = [];

      var results = response.rows[i].elements; 
      
      //build object
      for (var j = 0; j < results.length; j++) {
        originResults.push({ "destination":destinations[j], "distance":results[j].distance.text, "durationText":results[j].duration.text, "duration":parseFloat(results[j].duration.value)/60, "time":times[j] });
      }

      //sort by asc (duration+wait time)
      function compare(a,b) {
        if ( (a.duration + parseFloat(a.time)) < (b.duration + parseFloat(b.time)) )
           return -1;
        if ( (a.duration + parseFloat(a.time)) > (b.duration + parseFloat(b.time)) )
          return 1;
        return 0;
      }

      originResults.sort(compare);
	    originResults = originResults.slice(0,5); //keep top 5

      addMarker(origins[i], false);
      
      $('tbody').html('');
            
      for (var j = 0; j < originResults.length; j++) {
        addMarker(originResults[j].destination, true);
        totalTime = originResults[j].time+originResults[j].duration;
        rows = "<td>" + originResults[j].destination + "</td><td>" + originResults[j].distance + "</td><td>" + originResults[j].durationText + "</td><td>" + originResults[j].time + "</td><td>"+ totalTime.toFixed(2) + "</td>";
        var tbody = document.querySelector("#results tbody");
        tr = document.createElement("tr");
        tr.innerHTML = rows;
        tbody.appendChild(tr)
      }
    }
  }
  
}

function addMarker(location, isDestination) {
  var icon;
  if (isDestination) {
    icon = destinationIcon;
  } else {
    icon = originIcon;
  }
  geocoder.geocode({'address': location}, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
      bounds.extend(results[0].geometry.location);
      map.fitBounds(bounds);
      var marker = new google.maps.Marker({
        map: map,
        position: results[0].geometry.location,
        icon: icon
      });
      markersArray.push(marker);
    } else {
      alert('Geocode was not successful for the following reason: '
        + status);
    }
  });
}

function deleteOverlays() {
  for (var i = 0; i < markersArray.length; i++) {
    markersArray[i].setMap(null);
  }
  markersArray = [];
}

google.maps.event.addDomListener(window, 'load', initialize);
		