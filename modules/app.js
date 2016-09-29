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

      window.twttr = (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0],
          t = window.twttr || {};
        if (d.getElementById(id)) return t;
        js = d.createElement(s);
        js.id = id;
        js.src = "https://platform.twitter.com/widgets.js";
        fjs.parentNode.insertBefore(js, fjs);

        t._e = [];
        t.ready = function(f) {
          t._e.push(f);
        };

        return t;
      }(document, "script", "twitter-wjs"));

    };

}());
