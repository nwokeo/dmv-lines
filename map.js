var map;
var geocoder;
var bounds = new google.maps.LatLngBounds();
var markersArray = [];

//TODO: get this from geo IP
var origin1 = '90026'; //default origin

//limited to 10 results. buy biz license or ?
var destinations = [];
var times = [];
var officeUrl ='https://dmv-obiike.c9.io/dmv-lines/offices.json?callback=abc123' //TODO: retrieve from API
$.ajax({
  url: officeUrl,
  dataType: "jsonp",
  jsonpCallback: "abc123", /* Unique function name */
  success: function(json){
    for (office in json) {
      destinations.push(json[office].address); // json[office].address
      times.push(json[office].nonAppt);
    } 
  }
});

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
      destinations: destinations,
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
      //build one array per origin, one object per destination
      originResults = [];

      var results = response.rows[i].elements; 

      //TODO: move this
      var rows = '<tr><td>Destination</td><td>Distance</td><td>Drive Time</td><td>Wait Time</td></tr>'
      var thead = document.querySelector("#results thead");
      var tr = document.createElement("tr");
      tr.innerHTML = rows;
      thead.appendChild(tr);
      
      //build object
      for (var j = 0; j < results.length; j++) {
        originResults.push({"destination":destinations[j], "distance":results[j].distance.text, "duration":results[j].duration.text, "time":times[j]});
      }

      //sort by asc (duration+wait time)
      function compare(a,b) {
        if ( (parseInt(a.duration.substr(0,a.duration.indexOf(' '))) + parseInt(a.time)) < (parseInt(b.duration.substr(0,b.duration.indexOf(' '))) + parseInt(b.time)))
           return -1;
        if ((parseInt(a.duration.substr(0,a.duration.indexOf(' '))) + parseInt(a.time)) > (parseInt(b.duration.substr(0,b.duration.indexOf(' '))) + parseInt(b.time)))
          return 1;
        return 0;
      }

      originResults.sort(compare);
	    originResults = originResults.slice(0,5); //keep top 5

      
      addMarker(origins[i], false);
      for (var j = 0; j < originResults.length; j++) {
        addMarker(originResults[j].destination, true);
        
        //TODO: move this
        rows = "<td>" + originResults[j].destination + "</td><td>" + originResults[j].distance + "</td><td>" + originResults[j].duration + "</td><td>" + originResults[j].time + "</td>";
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
		