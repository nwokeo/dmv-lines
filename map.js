var map;
var geocoder;
var bounds = new google.maps.LatLngBounds();
var markersArray = [];

//TODO: get this from input
var origin1 = '90026'; //default origin

//TODO: get this from DMV data source. limit area somehow?
var destinationA = '9520 East Artesia Blvd. Bellflower, CA 90706';
var destinationB = new google.maps.LatLng(34.022569, -118.280258);

var destinationIcon = 'https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=D|FF0000|000000'; //TODO: dynamic naming
var originIcon = 'https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=O|FFFF00|000000';

function initialize() {
  var opts = {
    center: new google.maps.LatLng(34.078732, -118.262448),
    zoom: 10
  };
  map = new google.maps.Map(document.getElementById('map-canvas'), opts);
  geocoder = new google.maps.Geocoder();
}

function calculateDistances(origin) { //todo: geocode origins, get destinations from dmv source
  var service = new google.maps.DistanceMatrixService();
  service.getDistanceMatrix(
    {
      origins: [origin],
      destinations: [destinationA, destinationB], //TODO: get array of destinations
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
    
    // Get a reference to the table
    var tableRef = document.getElementById("myTable");
  
    for (var i = 0; i < origins.length; i++) {
      var results = response.rows[i].elements; 

      //sort by asc duration
      results.sort(function (a, b) {
		  if (a.duration.value > b.duration.value) {
		    return 1;
		  }
		  if (a.duration.value < b.duration.value) {
		    return -1;
		  }
		  return 0;
	  });

      //TODO: move this
      var rows = '<tr><td>Origin</td><td>Destination</td><td>Distance</td><td>Duration</td></tr>'
      var thead = document.querySelector("#results thead");
      var tr = document.createElement("tr");
      tr.innerHTML = rows;
      thead.appendChild(tr)
      
      addMarker(origins[i], false);
      for (var j = 0; j < results.length; j++) {
        addMarker(destinations[j], true);
        
        //TODO: move this
        rows = "<td>" + origins[i] + "</td><td>" + destinations[j] + "</td><td>" + results[j].distance.text + "</td><td>" + results[j].duration.text + "</td>";
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
		