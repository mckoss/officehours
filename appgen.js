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
    $.mobile.autoInitializePage = false;

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
            '      {properties}' +
            '      </ul>' +
            '    </div>' +
            '</div>',

        toolbarButton: '<a href="{href}" onclick="{onclick}" data-rel="{dataRel}">{label}</a>',

        propertyLine:
            '<li><div data-role="fieldcontain">' +
            '    <label class="ui-input-text" for="{label}">{label}:</label>' +
            '    <span>{value}</span>' +
            '</div></li>',

        list: '<ul data-role="listview">{content}</ul>',

        listLine: '<li><a href="#{key}-read">{item}</a></li>'
    },

    defaultToolbars: {
        read: {
            back: { label: "Back", dataRel: 'back' },
            edit: { label: "Edit",
                    condition: "app.currentUser() != undefined",
                    href: "#{id}-write" }
        },

        write: {
            back: { label: "Back", dataRel: 'back' },
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
        $.mobile.activePage = undefined;
        $('body').html(app.html());
        $.mobile.initializePage();
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
        $.mobile.changePage($('#' + id + '-' + mode));
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
        var view = schema.views.read;
        var instances = this.data[schemaName];
        var buttons = this.renderToolbarButtons(this.defaultToolbars.read);
        for (var key in instances) {
            var instance = instances[key];
            var properties = this.renderProperties(schema, instance, view.properties);
            result += this.templates.viewPage.format({app: this,
                                                      title: instance.title,
                                                      id: key,
                                                      view: 'read',
                                                      buttons: buttons,
                                                      properties: properties});
        }
        return result;
    },

    renderInstance: function(schema, view, instance) {
        if (view.format) {
            return view.format.format(instance);
        }
        return this.renderProperties(schema, instance, view.properties);
    },

    renderList: function(schemaName, viewName) {
        var result = "";
        var schema = this.schemas[schemaName];
        var instances = this.data[schemaName];
        var view = schema.views[viewName];
        for (var key in instances) {
            var item = this.renderInstance(schema, view, instances[key]);
            result += this.templates.listLine.format({item: item, schema: schemaName, key: key});
        }
        return this.templates.list.format({content: result});
    },

    // Render a subset of the properties of an instance.
    renderProperties: function (schema, instance, properties) {
        var result = "";
        for (var i = 0; i < properties.length; i++) {
            // TODO: Use datatype specific formatting for each property (and mode?)
            var label = properties[i];
            if (typeof(label) == 'string') {
                label = label[0].toUpperCase() + label.slice(1);
                var propertyDef = schema.properties[properties[i]];
                if (propertyDef && propertyDef.label) {
                    label = propertyDef.label;
                }
                result += this.templates.propertyLine.format({label: label,
                                                              value: instance[properties[i]]});
            } else if (label.view) {
                result += this.renderList(label.schema, label.view);
            } else if (label.command) {
                console.log("Command NYI", label);
                result += "<div>Command: {command}</div>".format(label);
            } else {
                console.log("Unknown property", label);
            }
        }
        return result;
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
