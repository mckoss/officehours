/* Source: namespace-plus.js */
/* Namespace.js - modular namespaces in JavaScript

   by Mike Koss - placed in the public domain
*/

(function(global) {
    var globalNamespace = global['namespace'];
    var VERSION = '3.0.1';

    function Module() {}

    function numeric(s) {
        if (!s) {
            return 0;
        }
        var a = s.split('.');
        return 10000 * parseInt(a[0]) + 100 * parseInt(a[1]) + parseInt(a[2]);
    }

    if (globalNamespace) {
        if (numeric(VERSION) <= numeric(globalNamespace['VERSION'])) {
            return;
        }
        Module = globalNamespace.constructor;
    } else {
        global['namespace'] = globalNamespace = new Module();
    }
    globalNamespace['VERSION'] = VERSION;

    function require(path) {
        path = path.replace(/-/g, '_');
        var parts = path.split('.');
        var ns = globalNamespace;
        for (var i = 0; i < parts.length; i++) {
            if (ns[parts[i]] === undefined) {
                ns[parts[i]] = new Module();
            }
            ns = ns[parts[i]];
        }
        return ns;
    }

    var proto = Module.prototype;

    proto['module'] = function(path, closure) {
        var exports = require(path);
        if (closure) {
            closure(exports, require);
        }
        return exports;
    };

    proto['extend'] = function(exports) {
        for (var sym in exports) {
            if (exports.hasOwnProperty(sym)) {
                this[sym] = exports[sym];
            }
        }
    };
}(this));
namespace.module('org.startpad.types', function (exports, require) {
    exports.extend({
        'VERSION': '0.1.0',
        'isArguments': function (value) { return isType(value, 'arguments'); },
        'isArray': function (value) { return isType(value, 'array'); },
        'copyArray': copyArray,
        'isType': isType,
        'typeOf': typeOf,
        'extend': extend,
        'project': project,
        'getFunctionName': getFunctionName
    });

    // Can be used to copy Arrays and Arguments into an Array
    function copyArray(arg) {
        return Array.prototype.slice.call(arg);
    }

    var baseTypes = ['number', 'string', 'boolean', 'array', 'function', 'date',
                     'regexp', 'arguments', 'undefined', 'null'];

    function internalType(value) {
        return Object.prototype.toString.call(value).match(/\[object (.*)\]/)[1].toLowerCase();
    }

    function isType(value, type) {
        return typeOf(value) == type;
    }

    // Return one of the baseTypes as a string
    function typeOf(value) {
        if (value === undefined) {
            return 'undefined';
        }
        if (value === null) {
            return 'null';
        }
        var type = internalType(value);
        if (baseTypes.indexOf(type) == -1) {
            type = typeof(value);
        }
        return type;
    }

    // IE 8 has bug that does not enumerates even own properties that have
    // these internal names.
    var enumBug = !{toString: true}.propertyIsEnumerable('toString');
    var internalNames = ['toString', 'toLocaleString', 'valueOf',
                         'constructor', 'isPrototypeOf'];

    // Copy the (own) properties of all the arguments into the first one (in order).
    function extend(dest) {
        var i, j;
        var source;
        var prop;

        if (dest === undefined) {
            dest = {};
        }
        for (i = 1; i < arguments.length; i++) {
            source = arguments[i];
            for (prop in source) {
                if (source.hasOwnProperty(prop)) {
                    dest[prop] = source[prop];
                }
            }
            if (!enumBug) {
                continue;
            }
            for (j = 0; j < internalNames.length; j++) {
                prop = internalNames[j];
                if (source.hasOwnProperty(prop)) {
                    dest[prop] = source[prop];
                }
            }
        }
        return dest;
    }

    // Return new object with just the listed properties "projected"
    // into the new object.  Ignore undefined properties.
    function project(obj, props) {
        var result = {};
        for (var i = 0; i < props.length; i++) {
            var name = props[i];
            if (obj && obj.hasOwnProperty(name)) {
                result[name] = obj[name];
            }
        }
        return result;
    }

    function getFunctionName(fn) {
        if (typeof fn != 'function') {
            return undefined;
        }
        var result = fn.toString().match(/function\s*(\S+)\s*\(/);
        if (!result) {
            return '';
        }
        return result[1];
    }

});
namespace.module('org.startpad.funcs', function (exports, require) {
    var types = require('org.startpad.types');

    exports.extend({
        'VERSION': '0.2.1',
        'methods': methods,
        'bind': bind,
        'decorate': decorate,
        'shadow': shadow,
        'subclass': subclass,
        'numericVersion': numericVersion,
        'monkeyPatch': monkeyPatch,
        'patch': patch
    });

    // Convert 3-part version number to comparable integer.
    // Note: No part should be > 99.
    function numericVersion(s) {
        if (!s) {
            return 0;
        }
        var a = s.split('.');
        return 10000 * parseInt(a[0]) + 100 * parseInt(a[1]) + parseInt(a[2]);
    }

    // Monkey patch additional methods to constructor prototype, but only
    // if patch version is newer than current patch version.
    function monkeyPatch(ctor, by, version, patchMethods) {
        if (ctor._patches) {
            var patchVersion = ctor._patches[by];
            if (numericVersion(patchVersion) >= numericVersion(version)) {
                return;
            }
        }
        ctor._patches = ctor._patches || {};
        ctor._patches[by] = version;
        methods(ctor, patchMethods);
    }

    function patch() {
        monkeyPatch(Function, 'org.startpad.funcs', exports.VERSION, {
            'methods': function (obj) { methods(this, obj); },
            'curry': function () {
                var args = [this, undefined].concat(types.copyArray(arguments));
                return bind.apply(undefined, args);
             },
            'curryThis': function (self) {
                var args = types.copyArray(arguments);
                args.unshift(this);
                return bind.apply(undefined, args);
             },
            'decorate': function (decorator) {
                return decorate(this, decorator);
            },
            'subclass': function(parent, extraMethods) {
                return subclass(this, parent, extraMethods);
            }
        });
        return exports;
    }

    // Copy methods to a Constructor Function's prototype
    function methods(ctor, obj) {
        types.extend(ctor.prototype, obj);
    }

    // Bind 'this' and/or arguments and return new function.
    // Differs from native bind (if present) in that undefined
    // parameters are merged.
    function bind(fn, self) {
        var presets;

        // Handle the monkey-patched and in-line forms of curry
        if (arguments.length == 3 && types.isArguments(arguments[2])) {
            presets = Array.prototype.slice.call(arguments[2], self1);
        } else {
            presets = Array.prototype.slice.call(arguments, 2);
        }

        function merge(a1, a2) {
            var merged = types.copyArray(a1);
            a2 = types.copyArray(a2);
            for (var i = 0; i < merged.length; i++) {
                if (merged[i] === undefined) {
                    merged[i] = a2.shift();
                }
            }
            return merged.concat(a2);
        }

        return function curried() {
            return fn.apply(self || this, merge(presets, arguments));
        };
    }

    // Wrap the fn function with a generic decorator like:
    //
    // function decorator(fn, arguments, wrapper) {
    //   if (fn == undefined) { ... init ...; return;}
    //   ...
    //   result = fn.apply(this, arguments);
    //   ...
    //   return result;
    // }
    //
    // The decorated function is created for each call
    // of the decorate function.  In addition to wrapping
    // the decorated function, it can be used to save state
    // information between calls by adding properties to it.
    function decorate(fn, decorator) {
        function decorated() {
            return decorator.call(this, fn, arguments, decorated);
        }
        // Init call - pass undefined fn - but available in this
        // if needed.
        decorator.call(fn, undefined, arguments, decorated);
        return decorated;
    }

    // Create an empty object whose __proto__ points to the given object.
    // It's properties will "shadow" those of the given object until modified.
    function shadow(obj) {
        function Dummy() {}
        Dummy.prototype = obj;
        return new Dummy();
    }

    // Classical JavaScript inheritance pattern.
    function subclass(ctor, parent, extraMethods) {
        ctor.prototype = shadow(parent.prototype);
        ctor.prototype.constructor = ctor;
        ctor.prototype._super = parent;
        ctor.prototype._proto = parent.prototype;
        methods(ctor, extraMethods);
    }

});
namespace.module('org.startpad.string', function (exports, require) {
  var funcs = require('org.startpad.funcs');

  exports.extend({
    'VERSION': '0.1.2',
    'patch': patch,
    'format': format
  });

  function patch() {
      funcs.monkeyPatch(String, 'org.startpad.string', exports.VERSION, {
          'format': function formatFunction () {
              if (arguments.length == 1 && typeof arguments[0] == 'object') {
                  return format(this, arguments[0]);
              } else {
                  return format(this, arguments);
              }
            }
      });
      return exports;
  }

  var reFormat = /\{\s*([^} ]+)\s*\}/g;

  // Format a string using values from a dictionary or array.
  // {n} - positional arg (0 based)
  // {key} - object property (first match)
  // .. same as {0.key}
  // {key1.key2.key3} - nested properties of an object
  // keys can be numbers (0-based index into an array) or
  // property names.
  function format(st, args, re) {
      re = re || reFormat;
      if (st == undefined) {
          return "undefined";
      }
      st = st.toString();
      st = st.replace(re, function(whole, key) {
          var value = args;
          var keys = key.split('.');
          for (var i = 0; i < keys.length; i++) {
              key = keys[i];
              var n = parseInt(key);
              if (!isNaN(n)) {
                  value = value[n];
              } else {
                  value = value[key];
              }
              if (value == undefined) {
                  return "";
              }
          }
          // Implicit toString() on this.
          return value;
      });
      return st;
  }

});
/* Source: appgen.js */
namespace.module('com.pageforest.appgen', function (exports, require) {
/*jslint evil: true */
var clientLib = require('com.pageforest.client');
var types = require('org.startpad.types');
var funcs = require('org.startpad.funcs').patch();
var string = require('org.startpad.string').patch();

exports.extend({
    'main': main
});

var jQT;

var DEFAULT_APP = "/officehours-app.js";
var DEFAULT_DATA = "/officehours-data.js";

// var app; -> app is a GLOBAL in the page - don't define here

var pfApp = {
    onSaveSuccess: function (json) {
    },

    setDoc: function (json) {
        // app.setData(json.blob);
    },

    getDoc: function() {
        return {
            blob: app ? app.getData() : {},
            readers: ['public']
        };
    },

    getDocid: function () {
        return undefined;
    },

    onUserChange: function() {
        if (app) {
            app.updatePages();
        }
    }
};

function main() {
    handleAppCache();
    client = new clientLib.Client(pfApp);

    $.ajax({
        url: DEFAULT_APP,
        dataType: 'text',
        success: function (data) {
            loadApp(data);
            $.ajax({
                dataType: 'text',
                url: DEFAULT_DATA,
                success: loadData
            });
        }
    });
}

function loadApp(appText) {
    var appDefinition = eval('(' + appText + ')');
    app = new Application(appDefinition);
}

function loadData(appData) {
    data = eval('(' + appData + ')');
    app.setData(data);
    app.updatePages();

    // jQTouch - piece of shit - needs to be initialized AFTER document is loaded
    // is there any way to deal with dynamic pages???
    jQT = new $.jQTouch({
        icon: 'jqtouch.png',
        addGlossToIcon: false,
        startupScreen: 'jqt_startup.png',
        statusBar: 'black'
    });
}

function Application(appDefinition) {
    this.setApp(appDefinition);
}

Application.methods({
    templates: {
        page: '<div id="{pageId}" class="{class}" section="full">' +
            '  <div class="toolbar"><h1>{title}</h1>{buttons}</div>' +
            '</div>',

        viewPage: '<div id="{id}-{view}" section="full">' +
            '  <div class="toolbar"><h1>{title}</h1>{buttons}</div>' +
            '  {properties}' +
            '</div>',

        toolbarButton: '<a class="{class}" href="{href}" onclick="{onclick}">{label}</a>',

        propertyLine: '<p>{name}: {value}</p>'
    },

    defaultToolbars: {
        read: {
            back: { label: "Back", 'class': 'back' },
            edit: { label: "Edit",
                    condition: "app.currentUser() != undefined",
                    href: "#{id}-write" }
        },

        write: {
            back: { label: "Back", 'class': 'back' },
            save: { label: "Save",
                    href: "#{id}-read",
                    onclick: "app.saveInstance('{schema}', '{id}')" }
        }
    },

    setApp: function (appDefinition) {
        types.extend(this, appDefinition);
        console.log("App loaded", this);
    },

    setData: function (data) {
        this.data = data;
        console.log("Data loaded", data);
    },

    getData: function (data) {
        return data;
    },

    getApp: function () {
        // TODO: Return projection of application definition properties
    },

    updatePages: function () {
        $('#jqt').html(app.html());
    },

    currentUser: function () {
        return client.username;
    },

    signIn: function () {
        client.signIn();
    },

    signOut: function () {
        client.signOut();
    },

    gotoInstance: function(schemaName, id, mode) {
        if (mode == undefined) {
            mode = 'read';
        }
        // TODO: prefix with schemaName for uniqueness
        jQT.goTo('#' + id + '-' + mode);
    },

    html: function () {
        var result = this.renderPage('home');

        result += this.renderSchemas();

        return result;
    },

    renderSchemas: function () {
        var result = "";
        for (var schemaName in this.schemas) {
            result += this.renderInstances(schemaName);
        }
        return result;
    },

    renderInstances: function (schemaName) {
        var result = "";
        var schema = this.schemas[schemaName];
        var instances = this.data[schemaName];
        var buttons = this.renderToolbarButtons(this.defaultToolbars.read);
        for (var key in instances) {
            var instance = instances[key];
            // TODO: Render write views as well???
            var properties = this.renderProperties(schema, instance, schema.views.read.properties);
            result += this.templates.viewPage.format({app: this,
                                                      id: key,
                                                      view: 'read',
                                                      buttons: buttons,
                                                      properties: properties});
        }
        return result;
    },

    // Render a subset of the properties of an instance.
    renderProperties: function (schema, instance, properties) {
        var result = "";
        for (var i = 0; i < properties.length; i++) {
            // TODO: Use datatype specific formatting for each property (and mode?)
            result += this.templates.propertyLine.format({name: properties[i],
                                                          value: instance[properties[i]]});
        }
        return result;
    },

    renderPage: function (pageId) {
        var page = this.pages[pageId];
        var buttons = this.renderToolbarButtons(page.toolbar);

        // TODO: Hack - not all pages are "current"
        return this.templates.page.format(types.extend({pageId: pageId,
                                                        app: this,
                                                        'class': 'current',
                                                        buttons: buttons}, page));
    },

    renderToolbarButtons: function (toolbar) {
        if (!toolbar) {
            return "";
        }
        var result = "";
        for (var cmd in toolbar) {
            var command = toolbar[cmd];
            var visible = this.evalCondition(command.condition);
            if (visible) {
                result += this.templates.toolbarButton.format(types.extend({href: '#',
                                                                            'class': 'button'},
                                                                            command));
            }
        }
        return result;
    },

    evalCondition: function (condition) {
        if (condition == undefined) {
            return true;
        }

        return eval('(' + condition + ')');
    }
});

// For offline - capable applications
function handleAppCache() {
    if (typeof applicationCache == 'undefined') {
        return;
    }

    if (applicationCache.status == applicationCache.UPDATEREADY) {
        applicationCache.swapCache();
        location.reload();
        return;
    }

    applicationCache.addEventListener('updateready', handleAppCache, false);
}
});

