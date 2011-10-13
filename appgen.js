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

    onUserChange: function() {
        if (app) {
            app.updatePages();
        }
    }
};

function main() {
    handleAppCache();
    client = new clientLib.Client(pfApp);

    jQT = new $.jQTouch({
        icon: 'jqtouch.png',
        addGlossToIcon: false,
        startupScreen: 'jqt_startup.png',
        statusBar: 'black'
    });

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
        page: '<div id="{pageId}" class="{class}">' +
            '  <div class="toolbar"><h1>{title}</h1>{buttons}</div>' +
            '</div>',

        viewPage: '<div id="{id}-{view}">' +
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
