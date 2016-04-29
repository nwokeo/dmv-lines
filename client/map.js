var calcWaitTimes = (function () {
    //"use strict";

    var map,
        geocoder,
        bounds = new google.maps.LatLngBounds(),
        markersArray = [],
        origin = '90013', //default
        destinations = [],
        destAddrs = [],
        destCoords = [],
        //times = [],
        //names = [],
        officeUrl = 'http:///offices.json?callback=waitTime'; //TODO: retrieve from API (v2)

    //TODO: wrap in function, dont call haversine unless its "done": 
    //http://stackoverflow.com/questions/24919590/ajax-call-using-iife-cant-seem-to-get-done-to-work-the-same-as-a-regular-func
    $.ajax({
        url: officeUrl,
        dataType: "jsonp",
        jsonpCallback: "waitTime", /* Unique function name */
        success: function (json) {
            for (var office in json) {
                destinations.push({ 'address': json[office].address, 'coords': [parseFloat(json[office].coords[0]), parseFloat(json[office].coords[1])], 
                                   'time':json[office].nonAppt, 'name':json[office].name });
                //times.push(json[office].nonAppt);
                //names.push(json[office].name);
            }
        }
    });

    Number.prototype.toRadians = function () {
        return this * Math.PI / 180;
    };


    function callHaversine(origin) {
      haversineTest(origin, destinations);
    }

    //only look at 20 closest DMV offices
    function haversineTest(origin, destinations) { //arr of float, arr of object
        codeAddress(origin, function (locationData) {
            destAddrs = [];
            //geocode origin
            var originCoords = [ locationData.geometry.location.lat(), locationData.geometry.location.lng() ];
            //calculate distances
            for (var i in destinations) {
              var R = 6371000; // earth's radius in metres
              var a1 = originCoords[0].toRadians();
              var a2 = destinations[i].coords[0].toRadians();
              var da = (destinations[i].coords[0]-originCoords[0]).toRadians();
              var dp = (destinations[i].coords[1]-originCoords[1]).toRadians();

              var a = Math.sin(da/2) * Math.sin(da/2) +
                      Math.cos(a1) * Math.cos(a2) *
                      Math.sin(dp/2) * Math.sin(dp/2);
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
            zoom: 10,
            scrollwheel: false,
            draggable: false
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
        var resultDestinations = response.destinationAddresses;
        var outputDiv = document.getElementById('outputDiv');
        deleteOverlays();

        for (var i = 0; i < origins.length; i++) {
          //build one array per origin, one object per destination
          var originResults = [];
          var results = response.rows[i].elements; 
          for (var j = 0; j < results.length; j++) {
              originResults.push({ "destination":resultDestinations[j], "name":destinations[j].name, "distance":results[j].distance.text, "durationText":results[j].duration.text, 
                                "duration":parseFloat(results[j].duration.value)/60, "time":destinations[j].time});
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
              
            var totalTime = originResults[j].time+originResults[j].duration;
            var rows = '<td><a href="https://www.google.com/maps/place/' + originResults[j].destination + '">' + originResults[j].name + "</a></td><td>" + originResults[j].distance + "</td><td>" + 
                originResults[j].durationText + "</td><td>" + originResults[j].time + "</td><td>"+ totalTime.toFixed(2) + "</td>";
            var tbody = document.querySelector("#results tbody");
            var tr = document.createElement("tr");
            tr.innerHTML = rows;
            tbody.appendChild(tr);
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
          alert('Geocode was not successful for the following reason: ' + status);
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
    
    return {
      callHaversine: callHaversine
    };
}());
