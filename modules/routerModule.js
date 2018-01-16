//IIFE FOR VARIABLE ENCAPSULATION
(function() {
  angular.module('routerModule', ['ui.router'])

    .run(function ($state,$rootScope) {
      $rootScope.$state = $state
    })

    .config(configRouter);

    configRouter.$inject = ['$stateProvider', '$urlRouterProvider', '$locationProvider'];

    function configRouter($stateProvider, $urlRouterProvider, $locationProvider){
      // Setting html5Mode as true to remove hashtag
      $locationProvider.html5Mode(true);
      $stateProvider
        .state('home',{
          url: '/',
          templateUrl: 'partials/home.html',
          controller: 'gregCtrl as gregCtrl'
        })
        .state('research',{
          url: '/research',
          views: {
            "": {
              templateUrl: 'partials/research.html',
              controller: 'gregCtrl as gregCtrl'
            },
            "overview@research": {
              templateUrl: 'partials/overview.html',
              controller: 'gregCtrl as gregCtrl'
            }
          }
        })
        .state('research.overview',{
          url: '/overview',
          templateUrl: 'partials/overview.html',
          controller: 'gregCtrl as gregCtrl'
        })
        .state('research.gec',{
          url: '/GEC',
          views: {
            "": {
              templateUrl: 'partials/gec.html',
              controller: 'gregCtrl as gregCtrl'
            },
            "waccm-gec@research.gec": {
              templateUrl: 'partials/waccm-gec.html',
              controller: 'gregCtrl as gregCtrl'
            }
          }
        })
        .state('research.gec.conductivity', {
          url: '/conductivity',
          templateUrl: 'partials/conductivity.html',
          controller: 'gregCtrl as gregCtrl'
        })
        .state('research.gec.sources', {
          url: '/sources',
          templateUrl: 'partials/sources.html',
          controller: 'gregCtrl as gregCtrl'
        })
        .state('research.gec.top-potential', {
          url: '/top-potential',
          templateUrl: 'partials/top-potential.html',
          controller: 'gregCtrl as gregCtrl'
        })
        .state('research.gec.magnetospheric-currents', {
          url: '/magnetospheric-currents',
          templateUrl: 'partials/magnetospheric-currents.html',
          controller: 'gregCtrl as gregCtrl'
        })
        .state('research.gec.results', {
          url: '/results',
          templateUrl: 'partials/results.html',
          controller: 'gregCtrl as gregCtrl'
        })
        .state('research.programming', {
          url: '/programming',
          templateUrl: 'partials/programming.html',
          controller: 'gregCtrl as gregCtrl'
        })
        .state('publications',{
          url: '/publications',
          templateUrl: 'partials/publications.html',
          controller: 'gregCtrl as gregCtrl'
        })
        .state('experience',{
          url: '/experience',
          templateUrl: 'partials/experience.html'
        })
        .state('outdoors',{
          url: '/outdoors',
          templateUrl: 'partials/outdoors.html',
          controller: 'gregCtrl as gregCtrl'
        })
        .state('contact',{
          url: '/contact',
          templateUrl: 'partials/contact.html',
          controller: 'gregCtrl as gregCtrl'
        });
      $urlRouterProvider.otherwise('/');
    };
}());
