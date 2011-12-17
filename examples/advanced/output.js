(function(){
window.QQ = {data:{}};
QQ.data.test = {"hi": "there"}
;
(function(){
/**
 * modul8 v0.14.2
 */

var config    = {"namespace":"QQ","domains":["app","shared"],"arbiters":{"monolith":["monolith"]}} // replaced
  , ns        = window[config.namespace]
  , domains   = config.domains
  , arbiters  = []
  , stash     = {}
  , DomReg    = /^([\w]*)::/;

/**
 * Initialize stash with domain names and move data to it
 */
stash.M8 = {};
stash.external = {};
stash.data = ns.data;
delete ns.data;

domains.forEach(function (e) {
  stash[e] = {};
});

/**
 * Attach arbiters to the require system then delete them from the global scope
 */
Object.keys(config.arbiters).forEach(function (name) {
  var arbAry = config.arbiters[name];
  arbiters.push(name);
  stash.M8[name] = window[arbAry[0]];
  arbAry.forEach(function (e) {
    delete window[e];
  });
});

/**
 * Converts a relative path to an absolute one
 */
function toAbsPath(pathName, relReqStr) {
  var folders = pathName.split('/').slice(0, -1);
  while (relReqStr.slice(0, 3) === '../') {
    folders = folders.slice(0, -1);
    relReqStr = relReqStr.slice(3);
  }
  return folders.concat(relReqStr.split('/')).join('/');
}

/**
 * Require Factory for ns.define
 * Each (domain,path) gets a specialized require function from this
 */
function makeRequire(dom, pathName) {
  return function (reqStr) {
    var o, scannable, k, skipFolder;

    if (config.logging >= 4) {
      console.debug('modul8: ' + dom + ':' + pathName + " <- " + reqStr);
    }

    if (reqStr.slice(0, 2) === './') {
      scannable = [dom];
      reqStr = toAbsPath(pathName, reqStr.slice(2));
    }
    else if (reqStr.slice(0, 3) === '../') {
      scannable = [dom];
      reqStr = toAbsPath(pathName, reqStr);
    }
    else if (DomReg.test(reqStr)) {
      scannable = [reqStr.match(DomReg)[1]];
      reqStr = reqStr.split('::')[1];
    }
    else if (arbiters.indexOf(reqStr) >= 0) {
      scannable = ['M8'];
    }
    else {
      scannable = [dom].concat(domains.filter(function (e) {
        return e !== dom;
      }));
    }

    reqStr = reqStr.split('.')[0];
    if (reqStr.slice(-1) === '/' || reqStr === '') {
      reqStr += 'index';
      skipFolder = true;
    }

    if (config.logging >= 3) {
      console.log('modul8: ' + dom + ':' + pathName + ' <- ' + reqStr);
    }
    if (config.logging >= 4) {
      console.debug('modul8: scanned ' + JSON.stringify(scannable));
    }

    for (k = 0; k < scannable.length; k += 1) {
      o = scannable[k];
      if (stash[o][reqStr]) {
        return stash[o][reqStr];
      }
      if (!skipFolder && stash[o][reqStr + '/index']) {
        return stash[o][reqStr + '/index'];
      }
    }

    if (config.logging >= 1) {
      console.error("modul8: Unable to resolve require for: " + reqStr);
    }
  };
}

/**
 * define module name on domain container
 * expects wrapping fn(require, module, exports) { code };
 */
ns.define = function (name, domain, fn) {
  var mod = {exports : {}}
    , exp = {}
    , target;
  fn.call({}, makeRequire(domain, name), mod, exp);

  if (Object.prototype.toString.call(mod.exports) === '[object Object]') {
    target = (Object.keys(mod.exports).length) ? mod.exports : exp;
  }
  else {
    target = mod.exports;
  }
  stash[domain][name] = target;
};

/**
 * Public Debug API
 */

ns.inspect = function (domain) {
  console.log(stash[domain]);
};

ns.domains = function () {
  return domains.concat(['external', 'data']);
};

ns.require = makeRequire('app', 'CONSOLE');

/**
 * Live Extension API
 */

ns.data = function (name, exported) {
  if (stash.data[name]) {
    delete stash.data[name];
  }
  if (exported) {
    stash.data[name] = exported;
  }
};

ns.external = function (name, exported) {
  if (stash.external[name]) {
    delete stash.external[name];
  }
  if (exported) {
    stash.external[name] = exported;
  }
};

}());

// shared code

QQ.define('calc','shared',function(require, module, exports){

module.exports = {
  divides: function(d, n) {
    return !(d % n);
  }
};

});
QQ.define('validation','shared',function(require, module, exports){
var divides;

divides = require('./calc').divides;

exports.isLeapYear = function(yr) {
  return divides(yr, 4) && (!divides(yr, 100) || divides(yr, 400));
};

});

// app code - safety wrap


(function(){
QQ.define('bigthing/sub2','app',function(require, module, exports){

module.exports = function(str) {
  return console.log(str);
};

});
QQ.define('helper','app',function(require, module, exports){
var testRunner;

module.exports = function(str) {
  return console.log(str);
};

});
QQ.define('bigthing/sub1','app',function(require, module, exports){
var sub2;

sub2 = require('./sub2');

exports.doComplex = function(str) {
  return sub2(str + ' (sub1 added this, passing to sub2)');
};

});
QQ.define('main','app',function(require, module, exports){
var b, helper, m, test, v;

helper = require('./helper');

helper('hello from app via helper');

b = require('bigthing/sub1');

b.doComplex('app calls up to sub1');

v = require('validation.coffee');

console.log('2004 isLeapYear?', v.isLeapYear(2004));

m = require('monolith');

console.log("monolith:" + m);

test = require('data::test');

console.log('injected data:', test);

});
}());
}());