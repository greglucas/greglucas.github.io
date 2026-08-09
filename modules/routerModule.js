//IIFE FOR VARIABLE ENCAPSULATION
(function() {
  angular.module('routerModule', ['ui.router'])
    .run(runRouter)
    .config(configRouter);

    runRouter.$inject = ['$state', '$rootScope', '$location', '$window']
    function runRouter($state, $rootScope, $location, $window) {
      $rootScope.$state = $state

      // Track pageview on state change. The site uses gtag.js (GA4), loaded in
      // index.html; the old analytics.js `ga` object never existed here, so this
      // previously threw on every navigation and no route change was ever recorded.
      $rootScope.$on('$stateChangeSuccess', function () {
          if (typeof $window.gtag === 'function') {
            $window.gtag('event', 'page_view', {
              page_path: $location.path(),
              page_location: $window.location.href,
              page_title: $window.document.title
            });
          }
      });
    };

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
          templateUrl: 'partials/research.html',
          controller: 'gregCtrl as gregCtrl'
        })
        .state('research.gec',{
          url: '/GEC',
          templateUrl: 'partials/gec.html',
          controller: 'gregCtrl as gregCtrl'
        })
        .state('research.gec.waccm-gec', {
          url: '/waccm-gec',
          templateUrl: 'partials/waccm-gec.html',
          controller: 'gregCtrl as gregCtrl'
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
        .state('research.geoelectric', {
          url: '/geoelectric',
          templateUrl: 'partials/geoelectric.html',
          controller: 'gregCtrl as gregCtrl'
        })
        .state('research.space-weather', {
          url: '/space-weather',
          templateUrl: 'partials/space-weather.html',
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
