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
        .state('gec',{
          url: '/GEC',
          views: {
            "": {
              templateUrl: 'partials/gec.html'
            },
            "waccm-gec@gec": {
              templateUrl: 'partials/waccm-gec.html'
            }
          }
        })
        .state('gec.conductivity', {
          url: '/conductivity',
          templateUrl: 'partials/conductivity.html'
        })
        .state('gec.sources', {
          url: '/sources',
          templateUrl: 'partials/sources.html'
        })
        .state('gec.top-potential', {
          url: '/top-potential',
          templateUrl: 'partials/top-potential.html'
        })
        .state('gec.magnetospheric-currents', {
          url: '/magnetospheric-currents',
          templateUrl: 'partials/magnetospheric-currents.html'
        })
        .state('gec.results', {
          url: '/results',
          templateUrl: 'partials/results.html'
        })
        .state('programming', {
          url: '/programming',
          templateUrl: 'partials/programming.html'
        })
        .state('publications',{
          url: '/publications',
          templateUrl: 'partials/publications.html'
        })
      $urlRouterProvider.otherwise('/')
    }
}())
