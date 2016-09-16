//IIFE FOR VARIABLE ENCAPSULATION
(function() {
  angular.module('routerModule', ['ui.router'])

    .run(function ($state,$rootScope) {
      $rootScope.$state = $state
    })

    .config(configRouter)

    configRouter.$inject = ['$stateProvider', '$urlRouterProvider']

    function configRouter($stateProvider, $urlRouterProvider){
      $stateProvider
        .state('home',{
          url: '/',
          templateUrl: 'partials/home.html'
        })
        .state('research',{
          url: '/research',
          views: {
            "": {
              templateUrl: 'partials/research.html'
            },
            "overview@research": {
              templateUrl: 'partials/overview.html'
            }
          }
        })
        .state('research.overview',{
          url: '/overview',
          templateUrl: 'partials/overview.html'
        })
        .state('research.gec',{
          url: '/GEC',
          views: {
            "": {
              templateUrl: 'partials/gec.html'
            },
            "waccm-gec@research.gec": {
              templateUrl: 'partials/waccm-gec.html'
            }
          }
        })
        .state('research.gec.conductivity', {
          url: '/conductivity',
          templateUrl: 'partials/conductivity.html'
        })
        .state('research.gec.sources', {
          url: '/sources',
          templateUrl: 'partials/sources.html'
        })
        .state('research.gec.top-potential', {
          url: '/top-potential',
          templateUrl: 'partials/top-potential.html'
        })
        .state('research.gec.magnetospheric-currents', {
          url: '/magnetospheric-currents',
          templateUrl: 'partials/magnetospheric-currents.html'
        })
        .state('research.gec.results', {
          url: '/results',
          templateUrl: 'partials/results.html'
        })
        .state('research.programming', {
          url: '/programming',
          templateUrl: 'partials/programming.html'
        })
        .state('publications',{
          url: '/publications',
          templateUrl: 'partials/publications.html'
        })
        .state('experience',{
          url: '/experience',
          templateUrl: 'partials/experience.html'
        })
        .state('outdoors',{
          url: '/outdoors',
          templateUrl: 'partials/outdoors.html'
        })
        .state('contact',{
          url: '/contact',
          templateUrl: 'partials/contact.html'
        })
      $urlRouterProvider.otherwise('/')
    }
}())
