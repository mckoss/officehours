/*jslint evil: true */
var clientLib = require('com.pageforest.client');
var types = require('org.startpad.types');
var funcs = require('org.startpad.funcs').patch();
var string = require('org.startpad.string').patch();

exports.extend({
    'main': main
});

var DEFAULT_APP = "/officehours-app.js";
var DEFAULT_DATA = "/officehours-data.js";
var STRING_PROPERTY = { type: 'string' };
var reFormat = /\{\s*([^} ]+)\s*\}/g;

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

    onUserChange: function(user) {
        if (app) {
            app.user = user;
            app.updatePages();
        }
    }
};

function main() {
    $.mobile.autoInitializePage = false;

    handleAppCache();
    client = new clientLib.Client(pfApp, {saveInterval: 0});

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
    // Global app variable
    app = new Application(appDefinition);
    app.user = client.username;
}

function loadData(appData) {
    data = eval('(' + appData + ')');
    app.setData(data);
    app.updatePages();
}

function Application(appDefinition) {
    this.setApp(appDefinition);
}

Application.methods({
    templates: {
        page:
            '<div id="{pageId}" data-role="page">' +
            '  <div data-role="header"><h1>{title}</h1>{buttons}</div>' +
            '    <div data-role="content">' +
            '      {content}' +
            '    </div>' +
            '</div>',

        viewPage:
            '<div id="{id}-{view}" data-role="page">' +
            '  <div data-role="header"><h1>{title}</h1>{buttons}</div>' +
            '    <div data-role="content">' +
            '      <ul data-role="listview">' +
            '      {content}' +
            '      </ul>' +
            '    </div>' +
            '</div>',

        toolbarButton: '<a href="{href}" onclick="{onclick}" data-rel="{dataRel}">{label}</a>',

        propertyLine:
            '<li><div data-role="fieldcontain">' +
            '    <label class="ui-input-text" for="{label}">{label}:</label>' +
            '    <span>{value}</span>' +
            '</div></li>',

        list: '<ul data-role="listview" data-inset="true">{content}</ul>',

        listLine: '<li><a href="#{key}-read">{item}</a></li>',

        commandLine: '<input type="button" data-theme="b" ' +
                     'onclick="app.doCommand(\'{schema}\', \'{command}\');" ' +
                     'value="{label}"/>'
    },

    defaultToolbars: {
        read: {
            back: { label: "Back", dataRel: 'back' },
            edit: { label: "Edit",
                    condition: "app.user != undefined",
                    href: "#{key}-write" }
        },

        write: {
            back: { label: "Back", dataRel: 'back' },
            save: { label: "Save",
                    href: "#{key}-read",
                    onclick: "app.saveInstance('{schema}', '{key}')" }
        }
    },

    defaultViews: {
        list: { format: "{title}" }
    },

    setApp: function (appDefinition) {
        types.extend(this, appDefinition);
        console.log("App loaded", this);
    },

    setData: function (data) {
        this.data = data;
        console.log("Data loaded", data);
    },

    getData: function () {
        return this.data;
    },

    getApp: function () {
        // TODO: Return projection of application definition properties
    },

    updatePages: function () {
        $.mobile.activePage = undefined;
        $('body').html(app.html());
        $.mobile.initializePage();
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
        $.mobile.changePage($('#' + id + '-' + mode));
    },

    doCommand: function(schemaName, commandName) {
        var schema = this.schemas[schemaName];
        var command = schema.commands[commandName];
        if (!this.action) {
            console.log("No command action for " + schemaName + '.' + commandName);
            return;
        }
        eval('(' + command.action + ')');
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
        // TODO: Render write view too
        var view = this.getView(schema, 'read');
        var instances = this.data[schemaName];
        // TODO: Move inside loop if toolbar buttons could depend on instance state
        var buttons = this.renderToolbarButtons(this.defaultToolbars.read);
        for (var key in instances) {
            var instance = instances[key];
            this.prepareInstance(schemaName, instance);
            var content = this.renderInstance(schemaName, view, instance);
            result += this.templates.viewPage.format({app: this,
                                                      title: instance.title,
                                                      id: key,
                                                      view: 'read',
                                                      buttons: buttons,
                                                      content: content});
        }
        return result;
    },

    renderInstance: function(schemaName, view, instance) {
        if (view.format) {
            return view.format.format(instance);
        }
        return this.renderProperties(schemaName, instance, view.properties);
    },

    renderList: function(schemaName, viewName, keys) {
        var result = "";
        var schema = this.schemas[schemaName];
        var instances = this.data[schemaName];
        var view = this.getView(schema, viewName);
        if (!keys) {
            keys = Object.keys(instances);
        }
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var item = this.renderInstance(schema, view, instances[key]);
            result += this.templates.listLine.format({item: item, schema: schemaName, key: key});
        }
        return this.templates.list.format({content: result});
    },

    getView: function(schema, viewName) {
        return schema.views[viewName] || this.defaultViews[viewName] || this.defaultViews['list'];
    },

    prepareInstance: function(schemaName, instance) {
        var schema = schemaName && this.schemas[schemaName];
        var properties = schema.properties;
        var propertyDef, propertyName;

        // Parse strings into correct property types
        for (propertyName in properties) {
            propertyDef = properties[propertyName];
            if (propertyDef.type == 'time') {
                if (typeof(instance[propertyName] == 'string')) {
                    instance[propertyName] = new Date(dateFromISO('1970-01-01T' +
                                                                  instance[propertyName]));
                }
            }
        }

        // Evaluate computed properties
        for (propertyName in properties) {
            propertyDef = properties[propertyName];
            if (propertyDef.computed) {
                instance[propertyName] = this.evalItemExpression(propertyDef.computed,
                                                                 instance);
            }
        }
    },

    // Render a subset of the properties of an instance.
    renderProperties: function (schemaName, instance, properties) {
        var result = "";
        var label;
        var value;
        var schema = schemaName && this.schemas[schemaName];

        for (var i = 0; i < properties.length; i++) {
            // TODO: Use datatype specific formatting for each property (and mode?)
            label = properties[i];
            if (typeof(label) == 'string') {
                label = label[0].toUpperCase() + label.slice(1);
                var propertyDef = schema.properties[properties[i]] || STRING_PROPERTY;
                if (propertyDef.label) {
                    label = propertyDef.label;
                }

                value = this.renderProperty(instance[properties[i]], propertyDef,
                                            instance, schemaName);
                result += this.templates.propertyLine.format({label: label, value: value});
            } else if (label.view) {
                result += this.renderList(label.schema, label.view);
            } else if (label.command) {
                result += this.renderCommand(label.schema || schemaName, label.command, instance);
            } else {
                console.log("Unknown property", label);
            }
        }
        return result;
    },

    renderProperty: function(value, propertyDef, instance, schemaName) {
        var schema = this.schemas[propertyDef.type];
        if (!schema) {
            // Formatted (string) property
            if (propertyDef.format && typeof(propertyDef.format) == 'string') {
                return this.renderExpression(propertyDef.format, instance, schemaName);
            }

            // TODO: Move to type-specific field class for Dates
            if (types.isType(value, 'date')) {
                switch (propertyDef.type) {
                case 'date':
                    return value.format('ddd, mmm, d, yyyy', true);
                case 'time':
                    return value.format('h:MM tt', true);
                case 'datetime':
                    return value.format('ddd, mmm, d, yyyy h:MM tt', true);
                }
            }

            if (value == undefined) {
                return '';
            }

            // TODO: Type-specific rendering
            return value.toString();
        }

        if (typeof value == 'string') {
            value = [value];
        }

        return this.renderList(propertyDef.type, 'list', value);
    },

    renderPage: function (pageId) {
        var page = this.pages[pageId];
        var buttons = this.renderToolbarButtons(page.toolbar);
        var content = this.renderProperties(undefined, undefined, page.properties);
        return this.templates.page.format(types.extend({pageId: pageId,
                                                        app: this,
                                                        buttons: buttons,
                                                        content: content}, page));
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
                result += this.templates.toolbarButton.format(types.extend({href: '#'},
                                                                           command));
            }
        }
        return result;
    },

    renderCommand: function(schemaName, commandName, instance) {
        var schema = this.schemas[schemaName];
        var command = schema.commands[commandName];
        var label = command.label || commandName[0].toUpperCase() + commandName.slice(1);
        var visible = this.evalCondition(command.condition, instance);
        if (!visible) {
            return '';
        }
        return this.templates.commandLine.format({label: label,
                                                  schema: schemaName,
                                                  command: commandName});
    },

    evalCondition: function (condition, item) {
        if (condition == undefined) {
            return true;
        }

        return this.evalItemExpression(condition, item);
    },

    evalItemExpression: function(expression, item) {
        return eval('(' + expression + ')');
    },

    // Format a string using values from an instance
    // {n} - positional arg (0 based)
    // {key} - object property (first match)
    // .. same as {0.key}
    // {key1.key2.key3} - nested properties of an object
    // keys can be numbers (0-based index into an array) or
    // property names.
    renderExpression: function (st, instance, schemaName) {
        var self = this;
        if (st == undefined) {
            return "undefined";
        }
        st = st.toString();
        st = st.replace(reFormat, function(whole, key) {
            var value = instance;
            var parts = key.split('|');
            key = strip(parts[0]);
            var fmt = strip(parts[1]);
            var keys = key.split('.');
            var propertyDef;
            for (var i = 0; i < keys.length; i++) {
                key = keys[i];
                propertyDef = self.schemas[schemaName].properties[key];
                var n = parseInt(key);
                if (!isNaN(n)) {
                    value = value[n];
                } else {
                    // TODO: Lookup referenced item and update schemaName and propertyDef
                    value = value[key];
                }
                if (value == undefined) {
                    return "";
                }
            }
            // Implicit toString() on this.
            return self.renderProperty(value, propertyDef, instance, schemaName);
        });
        return st;
    },

    // Utility function for computed properties
    addTime: function(d, h, m, s) {
        h = h || 0;
        m = m || 0;
        s = s || 0;
        d = new Date(d.getTime() + ((h * 60 + m) * 60 + s) * 1000);
        return d;
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

var regISO = new RegExp("^(\\d{4})-?(\\d\\d)-?(\\d\\d)" +
                        "(T(\\d\\d):?(\\d\\d):?((\\d\\d)" +
                        "(\\.(\\d{0,6}))?)?(Z|[\\+-]\\d\\d)?)?$");

//--------------------------------------------------------------------
// Parser is more lenient than formatter. Punctuation between date
// and time parts is optional. We require at the minimum,
// YYYY-MM-DD. If a time is given, we require at least HH:MM.
// YYYY-MM-DDTHH:MM:SS.sssZ as well as YYYYMMDDTHHMMSS.sssZ are
// both acceptable. Note that YYYY-MM-DD is ambiguous. Without a
// timezone indicator we don't know if this is a UTC midnight or
// Local midnight. We default to UTC midnight (the ISOFromDate
// function always writes out non-UTC times so we can append the
// time zone). Fractional seconds can be from 0 to 6 digits
// (microseconds maximum)
// -------------------------------------------------------------------
function dateFromISO(sISO) {
    var e = new Enum(1, "YYYY", "MM", "DD", 5, "hh", "mm",
                     8, "ss", 10, "sss", "tz");
    var aParts = sISO.match(regISO);
    if (!aParts) {
        return undefined;
    }

    aParts[e.mm] = aParts[e.mm] || 0;
    aParts[e.ss] = aParts[e.ss] || 0;
    aParts[e.sss] = aParts[e.sss] || 0;

    // Convert fractional seconds to milliseconds
    aParts[e.sss] = Math.round(+('0.' + aParts[e.sss]) * 1000);
    if (aParts[e.tz]) {
        if (aParts[e.tz] === "Z") {
            aParts[e.tz] = 0;
        } else {
            aParts[e.tz] = parseInt(aParts[e.tz], 10);
        }
    }

    // Out of bounds checking - we don't check days of the month is correct!
    if (aParts[e.MM] > 59 || aParts[e.DD] > 31 ||
        aParts[e.hh] > 23 || aParts[e.mm] > 59 || aParts[e.ss] > 59 ||
        aParts[e.tz] < -23 || aParts[e.tz] > 23) {
        return undefined;
    }

    var dt = new Date();

    dt.setUTCFullYear(aParts[e.YYYY], aParts[e.MM] - 1, aParts[e.DD]);

    if (aParts[e.hh]) {
        dt.setUTCHours(aParts[e.hh], aParts[e.mm],
                       aParts[e.ss], aParts[e.sss]);
    } else {
        dt.setUTCHours(0, 0, 0, 0);
    }

    // BUG: For best compatibility - could set tz to undefined if
    // it is our local tz Correct time to UTC standard (utc = t -
    // tz)
    dt.__tz = aParts[e.tz];
    if (aParts[e.tz]) {
        dt.setTime(dt.getTime() - dt.__tz * (60 * 60 * 1000));
    }
    return dt;
}

/* Javascript Enumeration - build an object whose properties are
   mapped to successive integers. Also allow setting specific values
   by passing integers instead of strings. e.g. new ns.Enum("a", "b",
   "c", 5, "d") -> {a:0, b:1, c:2, d:5}
*/
function Enum(args) {
    var j = 0;
    for (var i = 0; i < arguments.length; i++) {
        if (typeof arguments[i] == "string") {
            this[arguments[i]] = j++;
        }
        else {
            j = arguments[i];
        }
    }
}

Enum.methods({
    // Get the name of a enumerated value.
    getName: function(value) {
        for (var prop in this) {
            if (this.hasOwnProperty(prop)) {
                if (this[prop] == value) {
                    return prop;
                }
            }
        }
    }
});


function strip(s) {
    return (s || "").replace(/^\s+|\s+$/g, "");
}

