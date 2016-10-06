//IIFE FOR VARIABLE ENCAPSULATION
(function() {
  //CREATE MAIN ANGULAR MODULE AND INJECT DEPENDENCIES
  angular.module('gregLucas', ['routerModule'])
    .controller('gregCtrl', gregController);

    function gregController(){
      var gregCtrl = this;

      gregCtrl.parallax = function () {
        // AJAX call for parallax function
        $('.parallax').parallax();
      };

      gregCtrl.accordion = function () {
        // AJAX call for accordion function
        $('.collapsible').collapsible({
          accordion : false
        });
      };

    };

}());
