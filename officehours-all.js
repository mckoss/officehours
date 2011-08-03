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
/* Source: sample-data.js */
namespace.module('com.pageforest.officehours.sample-data', function (exports, require) {
namespace.lookup('com.pageforest.officehours.sample-data').defineOnce(function (ns) {
// display modes: view/edit/new

ns.appDefinition =  {
    relationships: [
        // Two element array.
        // name: defaults to schema name - if only one relationship between any two schema
        [{ schema: 'sessions', card: 1 }, { schema: 'reservations', card: 4 } ],
        [{ schema: 'sessions', card: 1 }, { schema: 'reservations', name: 'slot1', card: 1 } ],
        [{ schema: 'sessions', card: 1 }, { schema: 'reservations', name: 'slot2', card: 1 } ],
        [{ schema: 'sessions', card: 1 }, { schema: 'reservations', name: 'slot3', card: 1 } ],
        [{ schema: 'sessions', card: 1 }, { schema: 'reservations', name: 'slot4', card: 1 } ],
        [{ schema: 'sessions', card: 'many' }, { schema: 'users', name: 'owner',
                                                 label: 'Provider', card: 1 }]
    ],
    schema: {
        sessions: {
            views: {
                read: { ordering: [ 'title', 'description', 'owner', 'date',
                                    'hour', 'reservation' ]},
                write: {ordering: [ 'title', 'description', 'date', 'hour' ]},
                list: { ordering: [ 'title', 'owner', 'date', 'hour' ],
                        format: "{title}\n{owner} - {date} " }
            },

            properties: {
                // name: The unique (internal) name of a property in a schema
                // label: Text to display next to value in forms - defaults to capitalized 'name'
                // type: Underlying datatype for storing the property's value
                //    number, string (default), date, time, datetime, time-range, id,
                //    schema-instance (schema/id),
                //    recurring-date
                //
                //    special types: id, title, users,
                //    special properties: id, title, owner(users)
                // card: 1 (default)
                //
                // discuss later...cardinality, time ranges

                // "Special" properties
                title: { },

                description: { display: 'long-text' },
                date: { type: 'date' },
                time: { type: 'time' },
                reservations: { type: 'reservations', card: 4, owned: true},
                slot1: { type: 'reservations' },
                slot2: { type: 'reservations' },
                slot3: { type: 'reservations' },
                slot4: { type: 'reservations' },
                short: { type: 'formatted', format: "{title}\n{owner} - {date} {hourRange}" },
                hourRange: {type: 'formatted', format: "{time | time} - {time + 2/24 | time}" }
            }
        },

        users: {
            views: {
                read: { ordering: [ 'title', 'username', 'email', 'phone' ] },
                write: { ordering: [ 'title', 'email', 'phone' ] }
            },
            properties: {
                title: { label: 'Full Name' },
                owner: { label: 'User Name', unique: true, initialize: "client.username" },
                email: { label: 'E-Mail' },
                phone: { label: 'Phone Number' }
            }
        },

        reservations: {
            properties: {
                session: { type: 'sessions' },
                time: { compute: "session.time + session.indexOf(this) * 0.5/24",
                        format: "{time | time} - {time + 0.5/24 | time}" },
                status: { valid: ['available', 'reserved', 'canceled'] },
                reserver: { type: 'users' },
                owner: { type: 'users', compute: "session.owner" }
            }
        }
    }
};

    ns.wholeDoc = {
        title: "StartPad",
        blob: {
            //address: "811 First Ave\nSuite 480\nSeattle, WA 98104",
            //phone: "(206) 388-3466",
            sessions:   {
                "cwkoss-123": {
                    id: "cwkoss-123",
                    title: "Using JQTouch for Mobile Apps",
                    description: "This is a great session where you will learn lots of stuff about JQTouch.",
                    provider: "cwkoss",
                    date: new Date(2011, 10, 1),
                    time: 11,
                    "reservation-0": "cwkoss-123-0",
                    "reservation-1": "cwkoss-123-1",
                    "reservation-2": "cwkoss-123-2",
                    "reservation-3": "cwkoss-123-3"
                },
                "bobby-124":    {
                    id: "bobby-124",
                    title: "pwning Friends at Quoridor",
                    description: "Quoridor is a game that is most fun when you make your friends most frustrated.",
                    provider: "bobby",
                    date: new Date(2011, 2, 22),
                    time: 15,
                    "reservation-0": "bobby-124-0",
                    "reservation-1": "bobby-124-1",
                    "reservation-2": "bobby-124-2",
                    "reservation-3": "bobby-124-3"
                },
                "mckoss-8977":  {
                    id: "mckoss-8977",
                    title: "Angry Birds as Stress Relief",
                    description: "Get the pigs!  They have taken our eggs! Learn about angles and when to tap the screen.",
                    provider: "mckoss",
                    date: new Date(2011, 5, 6),
                    time: 14,
                    "reservation-0": "mckoss-8977-0",
                    "reservation-1": "mckoss-8977-1",
                    "reservation-2": "mckoss-8977-2",
                    "reservation-3": "mckoss-8977-3"
                }
            },
            users:      {
                "cwkoss":{
                    username: "cwkoss",
                    fullname: "Chris Koss",
                    phone: "425-246-7703",
                    email: "chris@mckoss.com"
                },
                "bobby":{
                    username: "bobby",
                    fullname: "Bobby Seidensticker",
                    phone: "425-555-1234",
                    email: "bobby@mckoss.com"
                },
                "mckoss":{
                    username: "mckoss",
                    fullname: "Mike Koss",
                    phone: "425-246-7701",
                    email: "mike@mckoss.com"
                }
            },
            reservations: { "cwkoss-123-0": {status: "Available", time: "11 :00AM - 11:30AM", parent:"cwkoss-123", owner: "cwkoss"},
                            "cwkoss-123-1": {status: "mckoss", time: "11:30AM - 12:00PM", parent:"cwkoss-123", owner: "cwkoss"},
                            "cwkoss-123-2": {status: "bobby", time: "12:00PM - 12:30PM", parent:"cwkoss-123", owner: "cwkoss"},
                            "cwkoss-123-3": {status: "Available", time: "12:30PM - 1:00PM", parent:"cwkoss-123", owner: "cwkoss"},
                            "bobby-124-0": {status: "cwkoss", time: "3:00PM - 3:30PM", parent:"bobby-124", owner: "bobby"},
                            "bobby-124-1": {status: "mckoss", time: "3:30PM - 4:00PM", parent:"bobby-124", owner: "bobby"},
                            "bobby-124-2": {status: "Cancelled", time: "4:00PM - 4:30PM", parent:"bobby-124", owner: "bobby"},
                            "bobby-124-3": {status: "Cancelled", time: "4:30PM - 5:00PM", parent:"bobby-124", owner: "bobby"},
                            "mckoss-8977-0": {status: "Available", time: "2:00PM - 2:30PM", parent:"mckoss-8977", owner: "mckoss"},
                            "mckoss-8977-1": {status: "Available", time: "2:30PM - 3:00PM", parent:"mckoss-8977", owner: "mckoss"},
                            "mckoss-8977-2": {status: "bobby", time: "3:00PM - 3:30PM", parent:"mckoss-8977", owner: "mckoss"},
                            "mckoss-8977-3": {status: "cwkoss", time: "3:30PM - 4:00PM", parent:"mckoss-8977", owner: "mckoss"}
                          },

            instructions: {
                sessions: {
                    settings:{  owner: "provider",
                                display: [["toolbar", ["value", "title"], ["back"], ["condition", "owned", "edit"]],
                                          ["ul", {"lines":["description", "provider", "date", "time"]}],
                                          ["h2", "Schedule"],
                                          ["ul", {"lines": ["reservation-0", "reservation-1", "reservation-2", "reservation-3"]}],
                                          ["condition", "owned", ["button", "", ["delete", "sessions", "key"], "Delete this Office Hour"]]],
                                edit: [["toolbar", ["value", "title"], ["back", "Cancel"], ["save"]],
                                       ["ul", {"lines":["description", "provider", "date", "time"]}]],


                                lineDisplay: [['', '<br/>', ' - ', ' - '],
                                              ["title", "provider", "date", "time"]]},
                    attr:   [
                        {
                            fieldName: "Title",
                            dataField: "title",
                            dataType: "string",
                            display: "h1text"
                        },
                        {
                            fieldName: "Description",
                            dataField: "description",
                            dataType: "textarea",
                            display: "nolabel"
                        },
                        {
                            fieldName: "Provider",
                            dataField: "provider",
                            dataType: "users",
                            condition: " != client.username",
                            editable: false
                        },
                        {
                            fieldName: "Date",
                            dataField: "date",
                            dataType: "date"
                        },
                        {
                            fieldName: "Time",
                            dataField: "time",
                            dataType: "time"
                        },
                        {
                            fieldName: "Rez 0",
                            dataField: "reservation-0",
                            dataType: "reservations",
                            display: "nolabel"
                        },
                        {
                            fieldName: "Rez 1",
                            dataField: "reservation-1",
                            dataType: "reservations",
                            display: "nolabel"
                        },
                        {
                            fieldName: "Rez 2",
                            dataField: "reservation-2",
                            dataType: "reservations",
                            display: "nolabel"
                        },
                        {
                            fieldName: "Rez 3",
                            dataField: "reservation-3",
                            dataType: "reservations",
                            display: "nolabel"
                        }]
                },

                users: {
                    settings:{lineDisplay: [['<div style="float:right">', '</div>'], ["fullname"]],
                              display: [["toolbar", "Profile", ["back"], ["condition", "owned", "edit"]],
                                        ["ul", {"lines": ["fullname", "phone", "email"]}],
                                        ["condition", "owned", ["link", "myappt", "My Appointments"]]],
                              edit:  [["toolbar", "Profile", ["back"], ["save"]],
                                      ["ul", {"lines": ["fullname", "phone", "email"]}]],
                              owner: "username",
                              lineEdit: []},
                    attr:[{
                        fieldName: "Name",
                        dataField: "fullname",
                        dataType: "string"
                    },
                          {
                              fieldName: "Phone",
                              dataField: "phone",
                              dataType: "string"
                          },
                          {
                              fieldName: "Email",
                              dataField: "email",
                              dataType: "string"
                          },
                          {
                              fieldName: "Username",
                              dataField: "username",
                              dataType: "users",
                              display: "nodisplay"
                          }
                         ]
                },
                reservations: {
                    settings:{lineDisplay: [['<div style="float:left">', '</div>','<div style="float:right">', '</div>'], ["time", "", "status"]],
                              display: [["toolbar", "Reservation", ["back"]],
                                        ["ul", {"lines": ["parent", "time", "status"]}],
                                        ["condition", "rezreserver", ["button", "", ["set", "status", "client.username", ""], "Reserve This Session"]],
                                        ["condition", "rezholder", ["button", "", ["set", "status", "\"Available\"", ""], "Cancel This Session"]],
                                        ["condition", "rezcancancel", ["button", "", ["set", "status", "\"Cancelled\"", ""], "Cancel This Session"]],
                                        ["condition", "rezcanuncancel", ["button", "", ["set", "status", "\"Available\"", ""], "Make Available"]]],
                              owner: "owner",
                              lineEdit: []},
                    attr:[{
                        fieldName: "Session",
                        dataField: "parent",
                        dataType: "sessions",
                        display: "nolabel",
                        linked: "nolink"
                    },
                          {
                              fieldName: "Time",
                              dataField: "time",
                              dataType: "string"
                          },
                          {
                              fieldName: "Status",
                              dataField: "status",
                              dataType: "string"
                          },
                          {
                              fieldName: "owner",
                              dataField: "owner",
                              dataType: "users",
                              display: "nodisplay"
                          }
                         ]
                },
                home: {
                    settings:{type:"pageSpec",
                              display: [["toolbar", "Startpad", ["condition", "notsignedin", ["button", "", "signIn()", "Sign In"]], ["condition", "signedin", ["button", "client.username", "", "My Profile"]]],
                                        ["h2", "Office Hours"],
                                        ["ul" , {"lines": ["sessions", "all"]}],
                                        ["condition", "signedin", ["button", "newSession", "", "Host an Office Hour"]]]
                             }
                },
                condition: {
                    signedin: "client.username != undefined",
                    owned: "isOwned(arg[0],arg[1])",
                    rezholder: "wholeDoc.blob.reservations[arg[1]].status == client.username",
                    rezavailable: "wholeDoc.blob.reservations[arg[1]].status == 'Available'",
                    rezcancelled: "wholeDoc.blob.reservations[arg[1]].status == 'Cancelled'",
                    rezcanceller: "(wholeDoc.blob.reservations[arg[1]].status == client.username) || isOwned(arg[0],arg[1])",
                    rezreserver: "(wholeDoc.blob.reservations[arg[1]].status == \"Available\") && (!isOwned(arg[0],arg[1]))",
                    rezcancancel: "(wholeDoc.blob.reservations[arg[1]].status != 'Cancelled') && isOwned(arg[0],arg[1])",
                    rezcanuncancel: "(wholeDoc.blob.reservations[arg[1]].status == 'Cancelled') && isOwned(arg[0],arg[1])"
                }

            }}


    };

});
});

/* Source: main.js */
namespace.module('com.pageforest.officehours', function (exports, require) {
/*jslint evil:true */
var clientLib = require('com.pageforest.client');
var base = require('org.startpad.base');

exports.extend({
    'onReady': onReady,
    'onUserChange': onUserChange,
    'setDoc': setDoc,
    'getDoc': getDoc,
    'saveNewSession': saveNewSession,
    'getDocid': getDocid,
    'setDocid': setDocid,
    'signIn': signIn,
    'signOut': signOut,
    'cancelSession': cancelSession,
    'wholeDoc': wholeDoc,
    'saveData': saveData,
    'setData': setData,
    'deleteData': deleteData
});

var client;
var textCutoff = 30; //This is the length at which a textarea will
//be displayed instead of a text input
var currentYear = 2011;
var wholeDoc = require('com.pageforest.officehours.sample-data').wholeDoc;

function onReady() {
    // Client library for Pageforest
    client = new clientLib.Client(exports);
    client.poll();

    //$('#newSession').submit(onNewSession);
}

function setDoc(stuff) {
    //client.log("stuff:" + stuff);
    $('#location-name').text(wholeDoc.title);

    updatePages();
    //sessionBuilder(sessions);
}

function getDoc() {
    return wholeDoc;
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/*  updatePages() Calls for a page to be built for each instance
    of each schema. (ignores special schema 'instructions'). Calls
    buildPage(dataType, key) sending dataType (what schema) and
    key (which instance of that schema to build) Calls buildPage
    for edit page if signed in and owner of instance
*/
function updatePages() {
    buildPage("home", "all");

    for (var schema in wholeDoc.blob) {
        if (schema != "instructions") {
            for (var key in wholeDoc.blob[schema]) {
                buildPage(schema, key);
                var owner = wholeDoc.blob.instructions[schema].settings.owner;
                // TODO: App specific code
                if (wholeDoc.blob[schema][key][owner] == client.username &&
                    schema != "reservations") {
                    buildPage(schema, key, "edit");
                }
            }
        }
    }

}

/*  buildPage(pageType, key) calls genPageHTML (pageType, key,
    style) (style is optional indication to build edit, rather
    than view) which returns HTML for referenced page. Once HTML
    returned, it is pushed to proper place to either create or
    update the page.
*/
function buildPage(pageType, key, style) {
    var html = "";
    var pageId = "";

    if (key[1] != undefined) {
        i = key[0];
        var j = key[1];
    }

    //client.log("pagetype: " + pageType + " key: " + key + " i:" + i + " j:" + j );
    style = style || 'display';

    pageId = key;
    if (style == "edit") {
        pageId += "edit";
    }

    if (pageType == "home") {
        pageId = "home";
        html = homeHTML();
    } else {
        html = genPageHTML(pageType, key, style);
    }

    if ($("#" + pageId).length == 0) {
        $("#jqt").append('<div id="' + pageId + '"></div>');
    }

    $("#" + pageId).html(html);
}

/* genPageHTML(pageType, key, style) Grabs display instructions
   from instructions[dataType].settings[pageEdit or pageDisplay]
   This is an ordered list of elements. Then, calls genElementHTML
   for each element in instruction array and returns concatenated
   html.
*/
function genPageHTML(pageType, key, style) {
    var html = "";

    style = style || 'display';

    var elements = wholeDoc.blob.instructions[pageType].settings[style];
    for (var i = 0; i < elements.length ; i++) {
        html += genElementHTML(elements[i], pageType, key, style);
    }
    return html;
}

/* genElementHTML(dataArray, dataType, key, style)
   builds an element based on instructions given
   dataArray[0] indicates the type of element to build.
   (can be "condition" for switch)
   subsequent array elements define how that element type should be created.
   Passes all display instructions to unique element builder
*/
function genElementHTML(dataArray, dataType, key, style) {
    // Switch on content type
    switch (dataArray[0]) {
    case 'condition':
        if (checkCondition(dataArray[1], [dataType, key])) {
            return genElementHTML(dataArray[2], dataType, key, style);
        }
        break;
    case 'ul':
        return genUlHTML(dataType, key, style, dataArray[1].lines);
    case 'h2':
        return "<h2>" + dataArray[1] + "</h2>";
    case 'link':
        return '<ul class="rounded"><li class="arrow"><a href="#' +
            dataArray[1] + '">' + dataArray[2] + '</a></li></ul>';
    case 'button':
        return buttonHTML(dataArray[3], dataArray[1], dataArray[2], dataType, key);
    case 'toolbar':
        return genToolbarHTML(dataArray[1], dataArray[2], dataArray[3], key, dataType);
    default:
        console.log("genElementHTML error: contentType not recognized");
        break;
    }
    return "";
}

function homeHTML() {
    var html = '';
    var buttons = [];
    var myAppts = '';
    if (client.username == undefined) {
        buttons.push({text: "Sign In", href: "", funct: "officehours.signIn();"});
    } else {
        buttons.push({text: client.username, href: client.username});
        myAppts = '<ul class="rounded"><li class="arrow">' +
            '<a href="#myappt">My Appointments</a></li></ul>';
    }
    html += toolbarHTML(wholeDoc.title, buttons) +
        '<h2 style="text-align:center">Office Hours</h2>';
    html += genUlHTML("sessions", "all", "display");
    html += buttonHTML("Host an Office Hour", "newSession");
    html += myAppts;
    return html;
}

function genUlHTML(dataType, key, style, lines) {
    /* generates a UL with data within scope

       arguments
       dataType: what kind of data
       key: name in dataType's namespace
       style: "display" or "edit"
    */

    style = style || 'display';

    var html = '<ul class="rounded">';
    var instructions = wholeDoc.blob.instructions[dataType];
    var target;

    if (key == "all") { //For building home sessions
        target = wholeDoc.blob[dataType];
        for (var id in target) {
            html += genLineHTML({"dataType": dataType,
                                 "value": id,
                                 "label": "nolabel",
                                 "style": "display",
                                 "link": id});
        }
    } else {
        target = wholeDoc.blob[dataType][key];

        for (var pos = 0; pos < lines.length; pos++) {
            for (var i = 0; i < instructions.attr.length; i++) {
                var attr = instructions.attr[i];
                if (attr.dataField == lines[pos]) {

                    if (!(attr.editable == false && style == "edit") &&
                        !(attr.display == "h1text" && style == "display") &&
                        (attr.display != "nodisplay")) {
                        var temp = "" + attr.dataField + "";
                        var value = target[temp];
                        var label = attr.fieldName;
                        var link = "nolink";
                        if (attr.display == "nolabel") {
                            label = "nolabel";
                        }
                        if ((attr.dataType != "string" && attr.dataType != "time" &&
                             attr.dataType != "date" && attr.dataType != "textarea") &&
                            style == "display") {
                            link = value;
                            //value = target;
                            //console.log("customdata value: " + value);
                        }
                        if (attr.linked != undefined && attr.linked == "nolink") {
                            link = "nolink";
                            //console.log("temp: " + attr.linked +" link: " + link);
                        }

                        html += genLineHTML({"dataType": attr.dataType,
                                             "value": value,
                                             "label": label,
                                             "style": style,
                                             "id": key + "-" + attr.dataField,
                                             "link": link});
                    }
                }
            }
        }

    }

    html += '</ul>';
    //console.log("genUlHTML returns: " + html);
    return html;

}

function genLineHTML(line) {
    /* This function is the generate the contents of a single line item.
       It accepts JSON object with
       dataType (string, date, sessions),
       value,
       label,
       rows,
       id, - for saving data out of editable fields
       style: (display/edit), and
       link (if it is to be hyperlnked)
    */


    var html = '<li';

    if (line.dataType == "textarea" && line.style == "display") {
        html += '>' + line.value;
    } else {
        var hasLink = line.link && line.link != "nolink";
        var hasLabel = line.label && line.label != "nolabel";

        if (hasLink) {
            html += ' class="arrow"><a href="#' + line.link + '"';
        }
        html += '>';

        if (hasLabel) {
            html += '<label style="float: left;">' + line.label + ':</label>';
            html += '<div style="float: right;">';
        }

        html += valueHTML(line.dataType, line.value, line.style, line.id);

        if (hasLabel) {
            html += '</div>';
        }

        if (hasLink) {
            html += '</a>';
        }
    }

    return html + '</li>';
}

function shuffleTemplates(templates, data) {
    //Shuffle in terms of perfect shuffle, interlaces template arrays
    var html = '';
    var str = '';
    //console.log("shuffletemp: " + eval("data.title"));
    for (var i = 0; i < templates[0].length; i++) {
        html += templates[0][i];
        if (templates[1][i]) {
            str = "" + templates[1][i] + "";
            //console.log("str: " + str + " exists: " + data);
            if (wholeDoc.blob[str]) {
                //console.log({"da str": str, "data": data});
                html += valueHTML(str, data[str], "display");
            }
            else {
                //console.log({"str": str, "data": data});

                var logme = valueHTML(str, data[str], "display");
                //console.log(logme);
                html += logme;
            }
        }

    }
    return html;
}

function valueHTML(dataType, value, style, id) {
    /*Converts value to dataTyped HTML view, calls self recursively for data objects
      args:
      dataType: string,date,time,textarea or data obj type
      value: one of above or reference to data obj type
      style: display/edit
      id: id to save editable fields
    */
    var html = '';

    if (style == "edit") {
        if (dataType == "string" || dataType == "textarea") {
            if (value.length < textCutoff) {
                html += '<input type="text" id="' + id + '" value="' +
                    value + '" style="width:100%" />';
            }
            else {
                html += '<textarea rows="2" style="width:100%" id="' + id +
                    '">' + value + '</textarea>';
            }
        }
        else if (dataType == "time") {
            html += timeHTML(id, value);
        }
        else if (dataType == "date") {
            html += editDateHTML(id, value);
        }
        else if (wholeDoc.blob[dataType]) {
            console.log("valueHTML ERROR: shouldn't be entire editing data objects " +
                        "with single form field, dataType: " + dataType);
        } else {
            //var instLoc = wholeDoc.blob.instructions[dataType];

            console.log({"dataType": dataType, "val": value});
            html += 9;
        }
    }
    else if (style == "display") {
        if (dataType == "string") {
            html += value;
        }
        else if (dataType == "date") {
            html += months[value.getMonth()] + ' ' + value.getDate();
        } else if (dataType == "time") {
            html += getTime(value);
        }
        else if (wholeDoc.blob[dataType]) {

            var temp = wholeDoc.blob[dataType];
            var temp2 = wholeDoc.blob.instructions[dataType];
            if (temp2 == "status") {
                console.log("Rez hit");
            }

            //console.log({"dataType": dataType, "val": value, "temp": temp,
            //"temp2": temp2, "templates": 0, "data": 0});
            var temp3 = temp2.settings.lineDisplay;
            //console.log("complex output: " + shuffleTemplates(temp3, temp[value]));
            html += shuffleTemplates(temp3, temp[value]);
        } else {
            html += value;
        }
    } else {
        console.log("valueHTML error: call not understood: neither edit nor display");
    }
    return html;
}

function genToolbarHTML(title, button1, button2, id, dataType) {
    if (typeof(title) == "object") {
        if (title[0] == "value") {
            title = wholeDoc.blob[dataType][id][title[1]];
        }
    }
    var html = '<div class="toolbar">' +
        '<h1>' + title + '</h1>';
    var buttons;
    if (button2) {
        buttons = [button1, button2];
    } else {
        buttons = [button1];
    }
    for (i = 0; i < buttons.length; i++) {
        var slide;
        if (i == 0) {
            slide = "slideleft";
        } else {
            slide = "slideright";
        }

        var buttonType = buttons[i][0];

        if (buttonType == "condition") {
            if (checkCondition(buttons[i][1], [dataType, id])) {
                buttonType = buttons[i][2];
            }


            //console.log(["condition output", buttonType]);
        }


        var buttontype = "button";
        /*if (buttons[i].text == "Save")
          buttontype = "saveButton";*/
        //console.log([typeof(buttons[i][0]), buttons[i][0]]);

        if (buttonType == "back" || buttons[i].funct == "back") {
            var buttonText = "Back";
            //if (buttons[i].text)
            //buttonText = buttons[i].text;
            html += '<a href="#" class="back">' + buttonText + '</a>';
        } else if (buttonType == "edit") {
            html += '<a href="#' + id + 'edit" class="button slideright">Edit</a>';
        } else if (buttonType == "save") {
            html += '<a  onclick="officehours.saveData(\'' + id + '\',\'' +
                dataType + '\',\'' + id + '\')" class="button slide reverse">Save</a>';
        }
    }

    html += '</div>';
    return html;
}

function toolbarHTML(h1txt, buttons) {
    // buttons is an array of the buttons. accepts either "back"
    // or JSON object with text, href and funct
    var html = '<div class="toolbar">' +
        '<h1>' + h1txt + '</h1>';

    for (i = 0; i < buttons.length; i++) {
        var slide;
        if (i == 0) {
            slide = "slideleft";
        } else {
            slide = "slideright";
        }

        var buttontype = "button";
        /*if (buttons[i].text == "Save")
          buttontype = "saveButton";*/

        if (buttons[i] == "back" || buttons[i].funct == "back") {
            html += '<a href="#" class="back">' + buttons[i].text + '</a>';
        } else if (buttons[i] == "save" || buttons[i].funct == "save") {
            html += '<a href="#" onclick="">' + buttons[i].text + '</a>';
        } else {
            html += '<a href="#' + buttons[i].href + '" class="' + buttontype + ' ' +
                slide + '" onclick="' + buttons[i].funct + '" >' + buttons[i].text + '</a>';
        }
    }

    html += '</div>';
    return html;
}



function buttonHTML(text, href, funct, dataType, key) {
    if (typeof(funct) == "object") {
        if (funct[0] == "set") {
            funct = "officehours.setData('" + dataType + "','" + key + "','" + funct[1] +
                "','" + eval(funct[2]) + "','" + funct[3] + "')";
        } else if (funct[0] == "delete") {
            funct = "officehours.deleteData('" + dataType + "','" + key + "','" +
                funct[1] + "','" + eval(funct[2]) + "','" + funct[3] + "')";
        }
    }
    var html = '<a href="#' + href + '" onclick="' + funct +  '" class="whiteButton">' +
        text + '</a>';
    return html;
}

function isOwned(dataType, key) {
    var type = wholeDoc.blob[dataType];
    var target = type[key];
    var instructions = wholeDoc.blob.instructions[dataType];
    var owner = instructions.settings.owner;
    if (target[owner] == client.username) {
        return true;
    } else {
        return false;
    }

}

function checkCondition(condition, arg) {
    var not = false;
    condition = "" + condition;
    if (condition.charAt(0) == "n" &&
        condition.charAt(1) == "o" &&
        condition.charAt(2) == "t") {
        not = true;
        console.log(condition);
        condition = condition.substr(3);
        console.log(condition);
    }
    var result = false;

    if (eval(wholeDoc.blob.instructions.condition[condition])) {
        result =  true;
    }

    // console.log("not: " + not + " result" + result + "output: "
    // + ( not ? !result : result ) + " condition: " + condition);

    if (not ? !result : result) {
        return true;
    } else {
        return false;
    }
}

function saveData(id, dataType, goPage) {
    if (goPage == undefined) {
        goPage = id;
    }
    var instructions = wholeDoc.blob.instructions[dataType];
    var target = wholeDoc.blob[dataType][id];
    //console.log({"id": id, "dataType": dataType, "target": target});

    for (var i = 0; i < instructions.attr.length; i++) {
        if ($('#' + id + '-' + instructions.attr[i].dataField).attr("value")) {
            target[instructions.attr[i].dataField] = $('#' + id + '-' +
                                                       instructions.attr[i].dataField)
                .attr("value");
        }
        if (instructions.attr[i].dataField == "date") {
            var month = $('#' + id + '-date-m').attr("value");
            var day = $('#' + id + '-date-d').attr("value");
            target["date"] = new Date(currentYear, month, day);
            //console.log({"day": day, "month": month, "target[date]": target["date"]});
        }

    }
    //console.log ({"id": id, "dataType": dataType, "target": target});
    client.setDirty();
    updatePages();
    jQT.goTo('#' + goPage);
}

function setData(dataType, key, dataField, value, goPage) {
    console.log('set');
    var dType = wholeDoc.blob[dataType];
    var target = dType[key];
    target[dataField] = value;
    console.log(target);
    client.setDirty();
    updatePages();
    jQT.goTo('#' + goPage);
}

function deleteData(a1, a2, a3, a4, a5) {
    console.log("deleteData: a1: " + a1 + ", a2:" + a2 +
                ", a3:" + a3 + ", a4:" + a4 + ", a5:" + a5);
    delete wholeDoc.blob[a1][a2];
    jQT.goTo('#home');
    updatePages();
}

function myAppointments(sessions) {
    var html = '';
    for (var key in sessions) {
        if (sessions[key].provider == client.username) {
            html += '<li class="arrow">' +
                '<a href="#' + sessions[key].id + '">' + sessions[key].title +
                ' <br/>' + userToFullname(sessions[key].provider) + ' - ' +
                months[sessions[key].date.getMonth()] + ' ' +
                sessions[key].date.getDate() +
                ' - ' + getTime(sessions[key].time) +
                '</a></li>';
        }
        for (var i = 0; i < 4; i++) {
            if (sessions[key].reservation[i] == client.username) {
                html += '<li class="arrow">' +
                    '<a href="#' + sessions[key].id + '">' + sessions[key].title +
                    ' <br/>' + userToFullname(sessions[key].provider) + ' - ' +
                    months[sessions[key].date.getMonth()] + ' ' +
                    sessions[key].date.getDate() +
                    ' - ' + getSeshTime(sessions[key].time, i) +
                    '</a></li>';
            }
        }
    }

    $('#myAppts').html(html);
}




function saveNewSession() {
    var seshTitle = $('#seshTitle').attr("value");
    var seshDesc = $('#seshDesc').attr("value");
    var month = $('#seshDate-m').attr("value");
    var day = $('#seshDate-d').attr("value");
    var seshDate = new Date(currentYear, month, day);
    //var seshDate = new Date($('#seshDate').attr("value"));
    var seshTime = $('#seshTime').attr("value");
    var newId = client.username + '-' + base.randomInt(10000);
    var newSesh = {
        id: newId,
        title: seshTitle,
        description: seshDesc,
        provider: client.username,
        date: seshDate,
        time: seshTime,
        "reservation-0": newId + "-0",
        "reservation-1": newId + "-1",
        "reservation-2": newId + "-2",
        "reservation-3": newId + "-3"
    };
    client.log(newSesh);
    wholeDoc.blob.sessions[newSesh.id] = newSesh;
    wholeDoc.blob.reservations[newSesh.id + "-0"] = {status: "Available",
                                                     time: "11 :00AM - 11:30AM",
                                                     parent: newId,
                                                     owner: client.username};
    wholeDoc.blob.reservations[newSesh.id + "-1"] = {status: "Available",
                                                     time: "11 :00AM - 11:30AM",
                                                     parent: newId,
                                                     owner: client.username};
    wholeDoc.blob.reservations[newSesh.id + "-2"] = {status: "Available",
                                                     time: "11 :00AM - 11:30AM",
                                                     parent: newId,
                                                     owner: client.username};
    wholeDoc.blob.reservations[newSesh.id + "-3"] = {status: "Available",
                                                     time: "11 :00AM - 11:30AM",
                                                     parent: newId,
                                                     owner: client.username};

    //client.log(wholeDoc.blob.sessions);
    client.log(wholeDoc.blob.reservations);
    client.setDirty();
    updatePages();
    jQT.goTo('#home');

}

function cancelSession(key) {
    client.log("CANCEL: " + key);
    wholeDoc.blob.sessions.splice(key, 1);
    updatePages();
    client.setDirty();
    jQT.goTo("#home");
}


function signOut() {
    client.log(client.signOut());

}

function signIn() {
    client.signIn();

}

function editSession() {

}

function onUserChange() {
    updatePages();
}

function getDocid() {
    return "Startpad";
}

function setDocid() {

}

function userToFullname(username) {
    for (var key in wholeDoc.blob.users) {
        if (wholeDoc.blob.users[key].username == username) {
            return wholeDoc.blob.users[key].fullname;
        }

    }
}

function timeSelect(time) {


    var html = '<select>';
    for (i = 0; i < times.length; i++) {
        if (time == i) {
            html += '<option value="' + i + '" selected ="yes">' + times[i] + '</option>';
        } else {
            html += '<option value="' + i + '">' + times[i] + '</option>';
        }
    }
    html += '</select>';

    alert("hi");
    return html;
}

function getTime(key) {
    if (key[1]) {
        return rezTime(key);
    }

    key = key % 24;
    var noon = (key % 12);
    if (noon == 0) {
        noon = 12;
    }

    var str = "" + noon + " ";
    if (key < 12 || key > 23) {
        str += ":00AM - ";
    } else {
        str += ":00PM - ";
    }

    noon = ((key + 2) % 12);
    if (noon == 0) {
        noon = 12;
    }
    str += noon;
    if ((key + 2) < 12 || (key + 2) > 23) {
        str += ":00AM";
    } else {
        str += ":00PM";
    }

    return str;
}
function rezTime(key) {
    return getSeshTime(key[0], key[1]);
}

function getSeshTime(time, rez) {
    if (rez > 1) {
        time++;
    }

    var str = "";

    if (time == 12 || time == 0) {
        str += '12';
    } else {
        str += (time % 12);
    }

    if (rez % 2 == 0) {
        str += ":00";
    } else {
        str += ":30";
    }

    if (time < 12 || time > 23) {
        str += "AM - ";
    } else {
        str += "PM - ";
    }

    if (rez % 2 == 1) {
        time++;
    }

    if (time == 12 || time == 0) {
        str += '12';
    } else {
        str += time % 12;
    }

    if (rez % 2 == 1) {
        str += ":00";
    } else {
        str += ":30";
    }

    if (time < 12 || time > 23) {
        str += "AM";
    } else {
        str += "PM";
    }

    return str;
}

function timeHTML(id, selected) {
    var html = '<select style="float:right" id="' + id + '">';
    for (var i = 0; i < 24; i++) {
        if (i == selected) {
            html += '<option selected value="' + i + '">' + getTime(i) + '</option>';
        } else {
            html += '<option value="' + i + '">' + getTime(i) + '</option>';
        }
    }

    html += '</select>';
    return html;
}

function dateHTML(date, id) {
    if (typeof(date) != "object") {
        console.log("dateHTML error: date is not an object, id: " + id +
                    "  date: " + date + "  - Reset to Jan1");
        date = new Date(2011, 1, 1);
    }

    return months[date.getMonth()] + " " + date.getDate();
}

function editDateHTML(id, date) {
    var select = '<select style="float:right" id="' + id + '-m">';
    for (i = 0; i < 12; i++) {
        select += '<option ';
        if (date.getMonth() == i) {
            select += 'selected ';
        }
        select += 'value="' + i + '">' + months[i] + '</option>';
    }
    select += '</select>';

    var html = '<input id="' + id +
        '-d" style="float:right" type="text" maxlength="2" size="2" value="' +
        date.getDate() + '" />' + select;

    return html;
}

});

/* Source: forms.js */
namespace.module('org.startpad.forms', function (exports, require) {
var types = require('org.startpad.types');
require('org.startpad.funcs').patch();
require('org.startpad.string').patch();

exports.extend({
    'Field': Field,
    'Form': Form
});

function Field(options) {
    types.extend(this, {
        patterns: {
            'display': "{valueText}",
            'edit': '<input id="{id}"/>'
        }
    }, options);
}

Field.methods({
    html: function (form) {
        return form.rowPattern.format(this.patterns[form.mode].format(this));
    }
});

function Form(options) {
    types.extend(this, {

    }, options);
}
});

