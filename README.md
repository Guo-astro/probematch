# @mapbox/probematch

Match a single GPS measurements (probe) or line of sequential GPS measurements (trace) to a road network.

*probematch* creates an [flatbush index](https://github.com/mourner/flatbush) of a road network to allow you to quickly match probes or traces to the roads using configurable distance and bearing filters.

### terms

- **probe** - a single GPS measurement, represented by a Feature&lt;Point&gt;
- **trace** - a collection of sequential GPS measurements, represented by a Feature&lt;LineString&gt;
- **road** - a Feature&lt;LineString&gt; representing a road, which we may attempt to match probes and traces to
- **roads, network, road network** - a FeatureCollection of roads
- **segment** - a single edge of a road. For road A -> B -> C, there are two segments: A -> B and B -> C. Segments always have only 2 points.

# install

`npm install @mapbox/probematch`

# configuration

```js
var probematch = require('@mapbox/probematch');

var roads = {
  'type': 'FeatureCollection',
  'features': [
    // Linestring features representing the road network
  ]
};

var matcher = probematch(roads, {
  compareBearing: true,
  maxBearingRange: 5,
  bidirectionalBearing: false,
  maxProbeDistance: 0.01
});
```

key | type | default | description
--- | --- | --- | ---
compareBearing | boolean | true | Should bearing of probes be used to evaluate match quality? <br /><br />If true, the bearing of the probe is compared to the bearing of each possible matching road segment. This ensures probes don't match cross-streets that obviously aren't the same as the probe's direction of travel
maxBearingRange | number | 5 | Maximum amount in degrees that a probe's bearing may differ from a road segment's when using `compareBearing`
bidirectionalBearing | boolean | false | Should bearing matches allow for probes to be moving in the opposite direction of a road segment's bearing? This should be true if the road network includes 2-way roads.
maxProbeDistance | number | 0.01 | Maximum distance in kilometers that a probe may be from a road segment in order to consider it a possible match. Prevents matching probes to segments that are too far away from them.




# usage
## match

```js
var probematch = require('@mapbox/probematch');

var roads = /* FeatureCollection of road geometries */;
var matcher = probematch(roads, {/* configuration */});

var probe = {
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [0, 0]
  }
};

var probeBearing  = 57; // probe's direction of travel in degrees

var results = matcher(probe, probeBearing);
```

The result of matching a single proble is an array of possible matches to the road network. Results are ordered by the probe's distance from the candidate road.

Each possible match represents a road that is likely to have matched the probe.

key | type | description
--- | --- | ---
**road** | Feature&lt;LineString&gt; | The geometry of a road that may have been matched
**index** | Number | The start index of the segment closest to the probe may have matched (in the road's coordinates)
**distance** | number | Distance (in kilometers) between the probe and the road
**bearing** | number | The bearing of the road at the location that matched

## matchTrace


```js
var probematch = require('@mapbox/probematch');

var roads = /* FeatureCollection of road geometries */;
var matcher = probematch(roads, {/* configuration */});

var results = matcher.matchTrace(line);
```

`matchTrace` returns an array of `match` results. The order of results is the same as the order of the coordinates in the input trace. This means that the zeroeth element in the `matchTrace` result is an array of possible matches for the zeroeth coordinate, and so on.
