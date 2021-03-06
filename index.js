'use strict';

var random = require('random-seed');
var assign = require('lodash/object/assign');
var isArray = require('lodash/lang/isarray');

var defaults = {
  seed: null,
  dimensions: 2,
  min: 0,
  max: 1,
  wavelength: 1,
  octaves: 8,
  octaveScale: .5,
  persistence: .5,
  interpolation: function(a, b, t) {
    return (1-Math.cos(Math.PI*t))/2 * (b-a) + a;
  }
};

function Perlin(options) {
  if (!options || !options.dimensions || options.dimensions === 2)
    return Perlin2D(options);

  options = assign(defaults, options);

  var data = [], rand = random.create();
  rand.seed(options.seed);

  var dim = options.dimensions,
      dim2 = 1 << dim,
      len = dim-1,
      min = options.min,
      lam = options.wavelength,
      oct = options.octaves,
      sca = 1/options.octaveScale,
      per = options.persistence,
      int = options.interpolation;

  // amp = sum_{i=1}^{oct} per^{i-1} = (per^oct-1)/(per-1)
  // val = (val/amp)*(max-min)+min = val*factor+min
  // factor = (max-min)*(per-1)/(per^oct-1)
  var fac = (options.max-min)*(per-1)/(Math.pow(per, oct)-1);

  // Get the [0, 1) value at coordinates x
  function _get(x) {
    // Calculate grid coordinates and dx values
    var _x = [], dx = [], i, j;
    for (i = 0; i < dim; ++i) {
      _x.push(Math.floor(x[i]));
      dx.push(x[i]-_x[i]);
    }

    // Store hypercube-corner values
    var values = [], t = [];
    for (i = 0; i < dim2; ++i) {
      for (j = 0; j < dim; ++j)
        t[j] = _x[j] + (i >> j & 1);
      values.push(_data(t));
    }

    // Repeatedly interpolate along axes
    for (i = 0; i < dim; ++i)
      for (j = 0, t = dim2 >> i; j < t; j += 2)
        values[j >> 1] = int(values[j], values[j+1], dx[i]);

    return values[0];
  }

  // Lazily get the grid value at coordinates x
  function _data(x) {
    var d = data, _x = x[0], i;
    for (i = 0; i < len; ++i, _x = x[i])
      d = d[_x] || (d[_x] = []);
    return d[_x] || (d[_x] = rand.random());
  }

  return {
    get: function(x) {
      // Scale coordinates by wavelength
      x = isArray(x) ? x : arguments;
      var i, j;
      for (i = 0; i < dim; ++i)
        x[i] /= lam;

      // Repeatedly add values from each octave
      var _x = [], value = 0, _sca, _per;
      for (i = 0, _sca = 1, _per = 1; i < oct; ++i, _sca *= sca, _per *= per) {
        for (j = 0; j < dim; ++j)
          _x[j] = x[j]*_sca;
        value += _get(_x)*_per;
      }

      // Put the value in range
      return value * fac + min;
    }
  };
}

function Perlin2D(options) {
  options = assign(defaults, options);

  var data = [], rand = random.create();
  rand.seed(options.seed);

  var min = options.min,
      lam = options.wavelength,
      oct = options.octaves,
      sca = 1/options.octaveScale,
      per = options.persistence,
      int = options.interpolation;

  // amp = sum_{i=1}^{oct} per^{i-1} = (per^oct-1)/(per-1)
  // val = (val/amp)*(max-min)+min = val*factor+min
  // factor = (max-min)*(per-1)/(per^oct-1)
  var fac = (options.max-min)*(per-1)/(Math.pow(per, oct)-1);

  // Get the [0, 1) value at coordinates (x, y)
  function _get(x, y) {
    var _x = Math.floor(x), _y = Math.floor(y), dx = x-_x;
    return int(
      int(_data(_x, _y  ), _data(_x+1, _y  ), dx),
      int(_data(_x, _y+1), _data(_x+1, _y+1), dx),
      y-_y
    );
  }

  // Lazily get the grid value at coordinates (x, y)
  function _data(x, y) {
    x = data[x] || (data[x] = []);
    return x[y] || (x[y] = rand.random());
  }

  return {
    get: function(x, y) {
      // Scale coordinates by wavelength
      if (isArray(x)) {
        y = x[1] / lam;
        x = x[0] / lam;
      } else {
        x /= lam;
        y /= lam;
      }

      // Repeatedly add values from each octave
      var value = 0, i, _sca, _per;
      for (i = 0, _sca = 1, _per = 1; i < oct; ++i, _sca *= sca, _per *= per)
        value += _get(x*_sca, y*_sca) * _per;

      // Put the value in range
      return value * fac + min;
    }
  };
}

module.exports = Perlin;
