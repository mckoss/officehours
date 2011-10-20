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
            '<div id="{key}" data-role="page">' +
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
            '    <label class="ui-input-text" for="{schema}-{id}-{propName}">{label}:</label>' +
            '    {value}' +
            '</div></li>',

        commandLine: '<input type="button" data-theme="b" ' +
                     'onclick="app.doCommand(\'{schema}\', \'{command}\');" ' +
                     'value="{label}"/>'
    },

    defaultToolbars: {
        read: {
            back: { label: "Back", dataRel: 'back' },
            edit: { label: "Edit",
                    condition: "app.hasView(item, 'edit')",
                    anchor: "{schema}-{id}-edit" }
        },

        edit: {
            back: { label: "Back", dataRel: 'back' },
            save: { label: "Save",
                    onclick: 'app.saveInstance(\'{schema}\', \'{id}\')' }
        }
    },

    defaultViews: {
        read: {},
        edit: {},
        list: { format: "{title}" }
    },

    setApp: function (appDefinition) {
        types.extend(this, appDefinition);
        console.log("App loaded", this);
    },

    setData: function (data) {
        this.data = data;
        this.prepareData();
        console.log("Data loaded", data);
    },

    getData: function () {
        return this.data;
    },

    getApp: function () {
        // TODO: Return projection of application definition properties
    },

    updatePages: function (target) {
        $.mobile.activePage = undefined;
        $('body').html(app.html());
        if (target) {
            window.location.hash = this.getPageKey(target._schema._name, target._key);
        }
        $.mobile.initializePage();
    },

    signIn: function () {
        client.signIn();
    },

    signOut: function () {
        client.signOut();
    },

    getPageKey: function (schemaName, id, mode) {
        var key = schemaName + '-' + id;
        if (mode == undefined) {
            mode = 'read';
        }
        if (mode != 'read') {
            key += '-' + mode;
        }
        return key;
    },

    gotoInstance: function (schemaName, id, mode) {
        $.mobile.changePage($('#' + this.getPageKey(schemaName, id, mode)));
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
        var rc = new RenderContext(this);

        // Render all the instances of each schema
        for (var schemaName in this.schemas) {
            rc.mode = 'read';
            result += this.renderInstances(rc, schemaName);
            rc.mode = 'edit';
            result += this.renderInstances(rc, schemaName);
        }

        return result;
    },

    renderInstances: function (rc, schemaName) {
        var result = "";
        var schema = this.schemas[schemaName];
        var instances = this.data[schemaName];
        for (var id in instances) {
            var instance = instances[id];
            var view = this.getView(schema, rc.mode, instance);
            if (!view) {
                continue;
            }
            if (rc.mode == 'edit' && instance.owner && instance.owner._key != app.user) {
                continue;
            }
            var content = this.renderInstance(rc, schemaName, view, instance);
            var buttons = this.renderToolbarButtons(this.defaultToolbars[rc.mode], schemaName, id);
            var key = this.getPageKey(schemaName, id, rc.mode);
            result += this.templates.viewPage.format({app: this,
                                                      title: this.renderExpression('{title}',
                                                                                   instance,
                                                                                   schemaName),
                                                      key: key,
                                                      view: rc.mode,
                                                      buttons: buttons,
                                                      content: content});
        }
        return result;
    },

    renderInstance: function(rc, schemaName, view, instance) {
        if (view.format) {
            return this.renderExpression(view.format, instance, schemaName);
        }
        var result = this.renderProperties(rc, schemaName, instance, view.properties);
        return result;
    },

    renderList: function(rc, schemaName, viewName, instances) {
        var schema = this.schemas[schemaName];
        if (!instances) {
            // Object.values ...
            instances = Object.keys(this.data[schemaName]).map(function (key) {
                return this.data[schemaName][key];
            });
        }
        var elements = [];
        for (var i = 0; i < instances.length; i++) {
            var instance = instances[i];
            var view = this.getView(schema, viewName, instance);
            if (!view) {
                continue;
            }
            var item = this.renderInstance(rc, schemaName, view, instance);
            elements.push({item: item,
                           schema: schemaName,
                           key: this.getPageKey(schemaName, instance._key)});
        }

        result = rc.renderList(elements);
        return result;
    },

    getView: function(schema, viewName, instance) {
        var view = schema.views[viewName] || this.defaultViews[viewName] ||
            this.defaultViews['list'];
        if (view.condition && !this.evalCondition(view.condition, instance)) {
            return undefined;
        }
        // Return extended view with all the properties of the schema appended
        if (!view.properties) {
            return types.extend({}, view, Object.keys(schema.properties));
        }
        return view;
    },

    hasView: function (instance, viewName) {
        var view = this.getView(instance._schema, viewName, instance);
        return view != undefined;
    },

    saveInstance: function (schemaName, id) {
        var schema = this.schemas[schemaName];
        var instance = this.getInstance(schemaName, id);
        var view = this.getView(schema, 'edit', instance);
        var properties = view.properties;
        for (var i = 0; i < properties.length; i++) {
            var propname = properties[i];
            if (typeof(propname) != 'string') {
                continue;
            }

            var fieldName = schema._name + '-' + instance._key + '-' + propname;
            var value = $('#' + fieldName).val();
            instance[propname] = value;
        }
        this.updatePages(instance);
    },

    prepareData: function() {
        // Ensure that all instances have a _key property.
        for (var schemaName in this.schemas) {
            this.schemas[schemaName]._name = schemaName;
            var instances = this.data[schemaName];
            for (var key in instances) {
                instances[key]._key = key;
                this.prepareInstance(schemaName, instances[key]);
            }
        }
    },

    prepareInstance: function(schemaName, instance) {
        var schema = schemaName && this.schemas[schemaName];
        var properties = schema.properties;
        var propertyDef, propertyName;

        instance._schema = schema;

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

        // Convert external object references to direct javascript references
        for (propertyName in properties) {
            propertyDef = properties[propertyName];
            var extSchemaName = propertyDef.type;
            var extSchema = this.schemas[extSchemaName];
            if (!extSchema) {
                continue;
            }
            var value = instance[propertyName];
            if (value == undefined) {
                continue;
            }
            if (typeof(value) == 'string') {
                instance[propertyName] = this.getInstance(extSchemaName, value);
                continue;
            }
            for (var i = 0; i < value.length; i++) {
                var val = value[i];
                value[i] = this.getInstance(extSchemaName, value[i]);
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
    renderProperties: function (rc, schemaName, instance, properties) {
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

                value = this.renderProperty(rc, instance[properties[i]], propertyDef,
                                            instance, schemaName, properties[i]);
                result += this.templates.propertyLine.format({label: label,
                                                              value: value,
                                                              schema: schemaName,
                                                              id: instance._key,
                                                              propName: properties[i]});
            } else if (label.view) {
                result += this.renderList(rc, label.schema, label.view);
            } else if (label.command) {
                result += this.renderCommand(label.schema || schemaName, label.command, instance);
            } else {
                console.log("Unknown property", label);
            }
        }
        return result;
    },

    renderProperty: function(rc, value, propertyDef, instance, schemaName, propName) {
        var schema = this.schemas[propertyDef.type];
        var result;
        if (!schema) {
            // Formatted (string) property
            if (propertyDef.format && typeof(propertyDef.format) == 'string') {
                result = this.renderExpression(propertyDef.format, instance, schemaName);
            } else if (types.isType(value, 'date')) {
                    switch (propertyDef.type) {
                    case 'date':
                        result = value.format('ddd, mmm, d, yyyy', true);
                        break;
                    case 'time':
                        result = value.format('h:MM tt', true);
                        break;
                    case 'datetime':
                        result = value.format('ddd, mmm, d, yyyy h:MM tt', true);
                        break;
                    }
            } else if (value == undefined) {
                result = '';
            } else {
                // TODO: Type-specific rendering
                result = value.toString();
            }

            return rc.renderField(result, schemaName, instance, propName);
        }

        // TODO: Render picker's for external item properties.

        if (value == undefined) {
            return "";
        }

        if (!types.isType(value, 'array')) {
            value = [value];
        }

        result = this.renderList(rc, propertyDef.type, 'list', value);
        return result;
    },

    renderPage: function (pageId) {
        var page = this.pages[pageId];
        var buttons = this.renderToolbarButtons(page.toolbar);
        var rc = new RenderContext(this);
        var content = this.renderProperties(rc, undefined, undefined, page.properties);
        return this.templates.page.format(types.extend({pageId: pageId,
                                                        app: this,
                                                        buttons: buttons,
                                                        content: content}, page));
    },

    renderToolbarButtons: function (toolbar, schemaName, id) {
        if (!toolbar) {
            return "";
        }
        var result = "";
        for (var cmd in toolbar) {
            var anchor = '';
            var command = toolbar[cmd];
            var onclick;
            var visible = this.evalCondition(command.condition, this.getInstance(schemaName, id));
            if (command.anchor) {
                anchor = command.anchor.format({schema: schemaName, id: id});
            }
            if (command.onclick) {
                onclick = command.onclick.format({schema: schemaName, id: id});
            }
            if (visible) {
                result += this.templates.toolbarButton.format(types.extend({href: '#' + anchor},
                                                                           command,
                                                                           {onclick: onclick}));
            }
        }
        return result;
    },

    getInstance: function (schemaName, id) {
        if (schemaName == undefined || id == undefined) {
            return undefined;
        }
        return this.data[schemaName][id];
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
        var rc = new RenderContext(this, 'expression');
        st = st.toString();
        st = st.replace(reFormat, function(whole, key) {
            var currentSchemaName = schemaName;
            var currentInstance = instance;
            var value = instance;
            var parts = key.split('|');
            key = string.strip(parts[0]);
            var fmt = string.strip(parts[1]);
            var keys = key.split('.');
            var propertyDef;
            for (var i = 0; i < keys.length; i++) {
                key = keys[i];
                propertyDef = self.schemas[currentSchemaName].properties[key];
                if (propertyDef.format) {
                    return self.renderExpression(propertyDef.format, instance, schemaName);
                }
                var n = parseInt(key);
                if (!isNaN(n)) {
                    value = value[n];
                } else {
                    currentInstance = value;
                    currentSchemaName = propertyDef.type;
                    value = value[key];
                }
                if (value == undefined) {
                    return "";
                }
            }
            return self.renderProperty(rc, value, propertyDef,
                                       currentInstance, currentSchemaName, key);
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

function RenderContext(app, mode) {
    this.app = app;
    // mode one of 'read', 'edit', 'expression'
    this.mode = mode || 'read';
}

RenderContext.methods({
    templates: {
        list: '<ul data-role="listview" data-inset="true">{content}</ul>',
        listLine: '<li><a href="#{key}">{item}</a></li>',

        fields: {
            text: {
                read: '<span>{content}</span>',
                edit: '<input type="text" id="{schema}-{id}-{propName}" value="{content}"/>'
            },
            number: {
                read: '<span>{content}</span>',
                edit: '<input type="number" id="{schema}-{id}-{propName}" value="{content}"/>'
            }
        }
    },

    renderList: function(a) {
        if (this.mode == 'expression') {
            a = a.map(function(obj) { return obj.item; });
            return a.join(', ');
        }

        var self = this;
        a = a.map(function(obj) {
            return self.templates.listLine.format(obj);
        });
        return this.templates.list.format({content: a.join('')});
    },

    renderField: function(content, schemaName, instance, propName) {
        var schema = this.app.schemas[schemaName];
        var type = 'text';
        if (schema && schema.type) {
            type = schema.type;
        }
        var template = this.templates.fields[type][this.mode] ||
            this.templates.fields[type]['read'];
        return template.format({schema: schemaName,
                                id: instance._key,
                                propName: propName,
                                content: content});
    }
});
