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
