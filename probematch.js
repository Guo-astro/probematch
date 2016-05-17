var rbush = require('rbush');
var extent = require('turf-extent');
var xtend = require('xtend');
var flatten = require('geojson-flatten');
var normalize = require('geojson-normalize');
var point = require('turf-point');
var linestring = require('turf-linestring');
var destination = require('turf-destination');
var pointOnLine = require('turf-point-on-line');
var distance = require('turf-distance');
var bearing = require('turf-bearing');

module.exports = function (roadNetwork, opts) {
  var options = xtend({
    maxProbeDistance: 0.01, // max kilometers away a probe can be to be considered a match
    rbushMaxEntries: 9,
    compareBearing: true, // should bearing be used to filter matches?
    maxBearingRange: 5, // max bearing degrees allowed between a probe and a potentially matching road
    bidirectionalBearing: false
  }, opts);

  var tree = rbush(options.rbushMaxEntries);
  var network = normalize(flatten(roadNetwork));
  var load = [];
  var segments = [];

  for (var i = 0; i < network.features.length; i++) {
    var coords = network.features[i].geometry.coordinates;
    for (var j = 0; j < coords.length - 1; j++) {
      var seg = linestring([coords[j], coords[j + 1]], {
        roadId: i,
        segmentId: j
      });
      var ext = padBbox(extent(seg), options.maxProbeDistance);
      seg.properties.bearing = bearing(point(coords[j]), point(coords[j + 1]));
      if (seg.properties.bearing < 0) seg.properties.bearing += 360;

      ext.id = segments.length;

      load.push(ext);
      segments.push(seg);
    }
  }
  tree.load(load);



  var match = function (probe, bearing) {
    var ext = padBbox(extent(probe), options.maxProbeDistance);
    var hits = tree.search(ext);
    var matches = [];

    if (options.compareBearing &&
      (bearing === null || typeof bearing === 'undefined')) return [];

    if (bearing && bearing < 0) bearing = bearing + 360;

    for (var i = 0; i < hits.length; i++) {
      var segment = segments[hits[i].id];
      var parent = network.features[segment.properties.roadId];

      if (options.compareBearing && !compareBearing(
        segment.properties.bearing,
        options.maxBearingRange,
        bearing,
        options.bidirectionalBearing
      )) continue;

      var p = pointOnLine(segment, probe);
      var dist = distance(probe, p, 'kilometers');

      if (dist <= options.maxProbeDistance) {
        matches.push({segment: segment, road: parent, distance: dist});
      }
    }

    matches.sort(function (a, b) {
      if (a.distance < b.distance) { return -1; }
      if (a.distance > b.distance) { return 1; }
      return 0;
    });
    return matches;
  };

  match.matchTrace = function (trace) {
    var coords = trace.coordinates || trace.geometry.coordinates;

    var firstpt, lastbearing;
    var results = [];

    for (var i = 0; i < coords.length - 1; i++) {
      if (!firstpt) firstpt = point(coords[i]);
      var nextpt = point(coords[i + 1]);
      lastbearing = bearing(firstpt, nextpt);
      results.push(match(firstpt, lastbearing));
      firstpt = nextpt;
    }
    // handle last point
    if (firstpt) results.push(match(firstpt, lastbearing));
    return results;
  };

  match.tree = tree;
  match.options = options;

  return match;
};

function compareBearing(base, range, bearing, bidirectional) {
  var min = base - range,
    max = base + range;

  if (bearing > min && bearing < max) return true;

  if (bidirectional) {
    min = min - 180;
    max = max - 180;

    if (min < 0) min = min + 360;
    if (max < 0) max = max + 360;

    if (bearing > min && bearing < max) return true;
  }

  return false;
}

function padBbox(bbox, tolerance) {
  var sw = point([bbox[0], bbox[1]]);
  var ne = point([bbox[2], bbox[3]]);
  var newSw = destination(sw, tolerance, -135, 'kilometers');
  var newNe = destination(ne, tolerance, 45, 'kilometers');

  return [
    newSw.geometry.coordinates[0],
    newSw.geometry.coordinates[1],
    newNe.geometry.coordinates[0],
    newNe.geometry.coordinates[1]
  ];
}
