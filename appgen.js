exports.extend({
    'main': main
});

var jQT;

function main() {
    jQT = new $.jQTouch({
        icon: 'jqtouch.png',
        addGlossToIcon: false,
        startupScreen: 'jqt_startup.png',
        statusBar: 'black'
    });
}
