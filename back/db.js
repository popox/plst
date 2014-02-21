var redis = require("redis").createClient();


var tracksKey = 'tracks';
var detailsKey = function(id){return 'track_info:' + id};

var addTrackDetails = function(track, cb){
  console.log('REDIS - adding track details', track);
  var key = detailsKey(track.id);

  redis.hset(key, 'title', track.title, function(err, res){
    redis.hset(key, 'artist', track.artist.name, cb);
  });
};

var incrTrack = function(id, score, cb){
  console.log('REDIS - incrementing track', id, 'by', score);
  redis.zincrby(tracksKey, score, id, cb);
};

var topTracks = function(cb){
  redis.zrevrangebyscore(tracksKey, '+inf', 0, 'withscores', cb);
};

var getTrackDetails = function(id, cb){
  redis.hgetall(detailsKey(id), cb);
};


module.exports = {

  add: function(track, cb){
    // TODO : only if non existing, and do the two simultanously
    addTrackDetails(track, function(){
      incrTrack(track.id, 1, cb);
    });
  },

  upvote: function(id, cb){
    incrTrack(id, 1, cb);
  },

  // NEED some promises here ...
  all: function(cb){

    topTracks(function(err, res){
      console.log('got all the tracks. err is', err, 'res is', res);

      // Got an array [id, score, id, score, ...] Format it to an object array
      var tracks = new Array();
      var missingTracks = (res.length/2);

      for (var i = 0 ; i < (res.length/2) ; i++) {
        (function(){
          var trackId = res[2*i];
          var trackScore = parseInt(res[2*i + 1]);

          getTrackDetails(trackId, function(err, res){

            console.log('got track details. err is', err, 'res is', res);

            var track = {
              id: trackId,
              score: trackScore,
              artist: res.artist,
              title: res.title
            };

            console.log('adding track', track);

            tracks.push(track);
            missingTracks -= 1;

            if (missingTracks === 0) {
              cb(tracks);
            }
          });
        })();
      };

    });
  }
};