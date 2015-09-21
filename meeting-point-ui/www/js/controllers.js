angular.module('starter.controllers', [])

  .controller('AppCtrl', function ($scope, $ionicModal, $timeout) {

    // With the new view caching in Ionic, Controllers are only called
    // when they are recreated or on app start, instead of every page change.
    // To listen for when this page is active (for example, to refresh data),
    // listen for the $ionicView.enter event:
    //$scope.$on('$ionicView.enter', function(e) {
    //});

    // Form data for the login modal
    $scope.loginData = {};

    // Create the login modal that we will use later
    $ionicModal.fromTemplateUrl('templates/login.html', {
      scope: $scope
    }).then(function (modal) {
      $scope.modal = modal;
    });

    // Triggered in the login modal to close it
    $scope.closeLogin = function () {
      $scope.modal.hide();
    };

    // Open the login modal
    $scope.login = function () {
      $scope.modal.show();
    };

    // Perform the login action when the user submits the login form
    $scope.doLogin = function () {
      console.log('Doing login', $scope.loginData);

      // Simulate a login delay. Remove this and replace with your login
      // code if using a login system
      $timeout(function () {
        $scope.closeLogin();
      }, 1000);
    };
  })

  .controller('PlaylistsCtrl', function ($scope) {
    $scope.playlists = [
      {title: 'Reggae', id: 1},
      {title: 'Chill', id: 2},
      {title: 'Dubstep', id: 3},
      {title: 'Indie', id: 4},
      {title: 'Rap', id: 5},
      {title: 'Cowbell', id: 6}
    ];
  })

  .controller('PlaylistCtrl', function ($scope, $stateParams) {
  })
  .controller('MapCtrl', function ($scope, $stateParams, $ionicLoading) {
    // User Infomation
    $scope.currentUserInfo = null;
    $scope.users = {};
    // Google Maps UI
    $scope.map = null;
    $scope.infowindow = null;
    $scope.refreshTimeout = null;

    $scope.initLocationSharing = function(location_callback, error_callback) {
      var randomGuid = guid();
      $scope.userInfo = {
        id: randomGuid, // Something like.. 5dccc6c8-717d-49928b84
        name: randomGuid,
        randomCoord: Math.random()
      };

      // ================================
      // Setup Socket IO
      // ================================
      $scope.socket = io.connect('http://localhost:8080');

      $scope.socket.on('connect', function () {
        $scope.socket.on('location', function (location) {
          console.log("emitting location");
          if (location.id != $scope.userInfo.id) {
            console.log("userLocationUpdate")
            $scope.userLocationUpdate(location);
          }
        })
      });

      // ================================
      // Setup Geolocation
      // ================================
      if (!navigator.geolocation) {
        return $scope.userInfo;
      }

      $scope.geo_success = function (position) {
        $scope.userInfo.latitude = position.coords.latitude + $scope.userInfo.randomCoord;
        $scope.userInfo.longitude = position.coords.longitude + $scope.userInfo.randomCoord;
        console.log("geosuccess");
        $scope.userLocationUpdate($scope.userInfo);
        $scope.sendLocation();
      };

      $scope.geo_error = function () {
        //error_callback();
      };

      $scope.sendLocationTimeout = null;
      $scope.sendLocation = function () {
        $scope.socket.emit('location', $scope.userInfo);
        clearTimeout($scope.sendLocationTimeout);
        $scope.sendLocationTimeout = setTimeout($scope.sendLocation, 1000 * 5);
      }

      $scope.geo_options = {enableHighAccuracy: true};
      navigator.geolocation.watchPosition($scope.geo_success, $scope.geo_error, $scope.geo_options);
      navigator.geolocation.getCurrentPosition($scope.geo_success, $scope.geo_error, $scope.geo_options);
      console.log("returning userInfo: " + $scope.userInfo)
      return $scope.userInfo;
    }

    $scope.userLocationUpdate = function (userInfo) {
      console.log("updating location")
      if (!$scope.users[userInfo.id]) $scope.users[userInfo.id] = {id: userInfo.id};

      $scope.users[userInfo.id].name = userInfo.name;
      $scope.users[userInfo.id].latitude = userInfo.latitude;
      $scope.users[userInfo.id].longitude = userInfo.longitude;
      $scope.users[userInfo.id].timestamp = new Date().getTime()
      console.log($scope.users[userInfo.id]);
      $scope.refreshMarkers();
    };

    $scope.refreshMarkers = function () {
      if (!$scope.map) return;
      console.log("refreshing markers")
      console.log($scope.map);
      if (!$scope.currentUserInfo.movedMapCenter && $scope.currentUserInfo.timestamp) {
        /* $('#user-name').val(currentUserInfo.name);
         $('#user-name').bind('keyup', function() {
         currentUserInfo.name = $('#user-name').val();
         })*/
        $scope.currentUserInfo.movedMapCenter = true;
        $scope.map.setCenter(new google.maps.LatLng(
          $scope.currentUserInfo.latitude, $scope.currentUserInfo.longitude));
      }
      for (var id in $scope.users) {
        var userInfo = $scope.users[id];
/*        if(userInfo.id == $scope.currentUserInfo.id)
          $scope.currentUserInfo = userInfo.id;*/
        if (userInfo.marker) {

          // If we havn't received any update from the user
          //  We remove the marker of missing user
          if (userInfo.id != $scope.currentUserInfo.id &&
            userInfo.timestamp + 1000 * 30 < new Date().getTime()) {
            userInfo.marker.setMap(null);
            delete $scope.users[id];
            continue;
          }
        } else {
          // Create a marker for the new user
          var marker = new google.maps.Marker({map: $scope.map});
          google.maps.event.addListener(marker, 'click', function () {
            $scope.infowindow.setContent(marker.getTitle())
            $scope.infowindow.open($scope.map, marker);
          });
          userInfo.marker = marker;
        }
        //Move the markers
        userInfo.marker.setTitle(userInfo.name);
        userInfo.marker.setPosition(
          new google.maps.LatLng(userInfo.latitude, userInfo.longitude));
      }

      /* $('#user-number').text(Math.max(Object.keys(users).length-1,0) +'')*/
      // Refresh the markers every 20 seconds
      clearTimeout($scope.refreshTimeout)
      $scope.refreshTimeout = setTimeout($scope.refreshMarkers, 1000 * 20);
    }

    $scope.mapInitialize = function () {
      console.log("initilizing map")
      $scope.map = new google.maps.Map(document.getElementById("map"), {
        zoom: 8,
        center: new google.maps.LatLng(40, -74),
        mapTypeId: google.maps.MapTypeId.ROADMAP
      });
      $scope.currentUserInfo = $scope.initLocationSharing($scope.userLocationUpdate);
      $scope.infowindow = new google.maps.InfoWindow({content: 'Test'});
      google.maps.event.addListener(map, 'click', function () {
        infowindow.close(map);
      });
      $scope.refreshMarkers();
    };

    $scope.mapInitialize()
    //google.maps.event.addDomListener(window, 'load', $scope.mapInitialize);



    /* google.maps.event.addDomListener(window, 'load', function () {
     var myLatlng = new google.maps.LatLng(37.3000, -120.4833);
     console.log(myLatlng);

     var map = new google.maps.Map(document.getElementById("map"), mapOptions);

     navigator.geolocation.getCurrentPosition(function (pos) {
     map.setCenter(new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
     var myLocation = new google.maps.Marker({
     position: new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude),
     map: map,
     title: "My Location"
     });
     });

     $scope.map = map;
     });*/
  });

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + s4();
}
