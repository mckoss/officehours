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
        page: '<div id="{pageId}" class="current">' +
            '<div class="toolbar">' +
            '<h1>{title}</h1>' +
            '{buttons}' +
            '</div></div>',

        toolbarButton: '<a class="button" href="{href}" onclick="{onclick}">{label}</a>'
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
        return this.renderPage('home');
    },

    renderPage: function (pageId) {
        var page = this.pages[pageId];
        var buttons = "";

        if (page.toolbar) {
            for (var cmd in page.toolbar) {
                var command = page.toolbar[cmd];
                var visible = this.evalCondition(command.condition);
                if (visible) {
                    buttons += this.templates.toolbarButton.format(types.extend({href: '#'},
                                                                                command));
                }
            }
        }

        return this.templates.page.format(types.extend({pageId: pageId,
                                                        app: this,
                                                        buttons: buttons}, page));
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

// Notes about properties
// id: The unique (internal) name of a property in a schema
// label: Text to display next to value in forms - defaults to capitalized 'name'
// type: Underlying datatype for storing the property's value
//    number, string (default), date, time, datetime, time-range, id,
//    schema-instance (schema/id),
//    recurring-date
//
// card: 0-1 (default)

/*

Properties in every schema:

id: {type: string},
owner: The creator of an instance.
   Default definition { type: users } (the type cannot be changed).
short: This property is used to display references to instances.
   Default definition is { format: "{title}" }

Optional special properties:

title: Optional default title of an instance

users is a special schema which always exists (id == username)

The default 'short' format is title alone.

Attributes of properties:

type:
format:
compute:
label:

Datatype Universe

Basic Types: number, string (255), text(string any length), date, time,
   datetime, instance (stored as id of target), boolean, enumerated
Future basic types:   file (blob), image, video, audio
Extend Types: currency (number), long-text, phone number, address, email address, url,
   person's name, zip code, rich text (html),
Size limit


*/

