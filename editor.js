/*
Todo: 
-Special Page editing

Talk to dad about:
-How do we want to handing the 'format' field?  Right now, 
    sometimes it is a string, and sometimes it is an object.
    Is this right? 
*/
namespace.lookup('com.pageforest.kahnsept.editor').defineOnce(function(ns) {
    var kahnsept = namespace.lookup("com.pageforest.kahnsept");
    var base = namespace.lookup("org.startpad.base");
    var world;

    var selectedSchema = "users";
    var editingProp = null;
    var editingInstNum = null;
    var instances = [];

    function loadDatabase(json) {
        //selectedSchema = "users";
    }

    function onReady() {
    $.ajax({
        url: "/officehours-app.js",
        dataType: 'text',
        success: function(data){
            setWorld(data);
        }
     });
    }
    
    function setWorld(data){
        world = eval('(' + data + ')');
        //console.log(world);
        display();
    }

    function display() {
        validateData();
        displaySchemaList();
        displaySchemaDefinition();
        //displayInstances();
    };

    function validateData() {
        if(!world.schemas[selectedSchema]) {
            console.log("ERROR: selected schema " + selectedSchema + 
                        " does not exist in the data model");
        }
    }


    function displaySchemaList() {
        $("#schemaList").html('<h3>Schema List</h3><ol>');
        for(var key in world.schemas) {
            var schema = world.schemas[key];
            if (key == selectedSchema) {
                $("#schemaList").append('<li>' + capitalize(key) + '</li>');
            }
            else {
                $("#schemaList").
                    append('<li><a href="#" onclick="editor.selectSchema(\'' +
                           key + '\');">' + capitalize(key) + '</a></li>');
            }
        }

        $("#schemaList").
            append('</ol><input type="textbox" id="newSchemaName"' +
                   ' value="New Schema Name" /><br>' +
                   '<input type="button" value="Create"' +
                   ' onclick="editor.createSchema();" />');
    }

    function setSchemaTitleBar(selectedSchema) {
        $("#defTitle").html('<h3 style="width:750px; height:45px; float:left;">' +
               capitalize(selectedSchema) + ' Definition</h3>' +
               '<div style="float:left; margin-top:15px;">' +
               '<input type="button" value="Delete" ' +
               'onclick="editor.deleteSchema();" /></div>');
    }


    function displaySchemaDefinition() {

    	setSchemaTitleBar(selectedSchema);

        var thisSchema = world.schemas[selectedSchema];

        var schemaDefStr = ""

	    for (var propName in thisSchema.properties) {
            schemaDefStr += displayProp(propName);
	    }
        $("#schemaDefinition").html(schemaDefStr);
        
	    $("#schemaDefinition").append('<div class="schemaDefinitionLine">' +
	    		'newPropName: <input type="textbox" id="newPropName" '+
	    		'style="width:100px;">' + ' Type: ' + typeSelect(undefined, "newPropType") +
	    		'<input type="button" ' +
	    		'value="Add Property" onclick="editor.addProp();" /></div>');
    }

    function displayProp(propName) {
        if(!world.schemas[selectedSchema].properties[propName]) {
            console.log("ERROR: property " + propName + 
                        " does not exist in schema " + selectedSchema);
        }
        var prop = world.schemas[selectedSchema].properties[propName];
        if(prop.type === undefined) {
            prop.type = "string";
        }
        var schemaDefStr = "";

        //EDIT MODE
        if (editingProp == propName) {
            schemaDefStr += '<div class="schemaDefinitionLine">' +
                '<strong>'+ capitalize(propName) + ':</strong><ul>' +
                '<li>Property Name: <input type="textbox" value="' +
                propName +
                '" id="propName" /></li>' +
                '<li>Type: ' + typeSelect(prop.type) + '</li>';
            if(prop.computed && prop.computed != "") {
                schemaDefStr += '<li>Computed : <input type="textbox" value="' + prop.computed +
                                '" id="computed" /></li>';
            }
            if(prop.format && prop.format != "") {
                schemaDefStr += '<li>Format : ';
                if(typeof(prop.format) == "object") {
                    schemaDefStr += '(';
                    var firsttime = true
                    for(var key in prop.format){
                        if(firsttime != true) {
                            schemaDefStr += ', ';
                        }
                        schemaDefStr += capitalize(key) + ': ' + '<input type="textbox" value="' + 
                                        prop.format[key] + '" id="format' + key + '" />';
                        firsttime = false;
                    }
                    schemaDefStr += ')';
                } else {
                schemaDefStr += '<input type="textbox" value="' + prop.format +
                                '" id="format" />';
                }
                schemaDefStr += '</li>';
            }
            if(prop.label && prop.label != "") {
                schemaDefStr += '<li>Label : <input type="textbox" value="' + prop.label +
                                '" id="label" /></li>';
            }
            schemaDefStr += addNewField(prop);
            schemaDefStr += '</ul>';
            schemaDefStr += '<div class="editDeleteButtons">' +
                                '<input type="button" value="Save" ' + 
                                'onclick="editor.saveProp(\'' + propName + 
                                 '\');" /><input type="button" value="Reset"' +
                                'onclick="editor.resetProp();" />' +
                            '</div>';
            schemaDefStr += '</div>';
        }
        else {
            //READ MODE
            schemaDefStr += '<div class="schemaDefinitionLine">';
            schemaDefStr += '<div class="editDeleteButtons"><input type="button"' +
                    'value="Edit" onclick="editor.editProp(\'' + 
                    propName + '\');" /><input type="button" ' + 
                    'value="Delete" onclick="editor.delProp(\'' + 
                    propName + '\');" /></div>';
            schemaDefStr += '<strong>' + capitalize(propName) + ':</strong>' +
                    '<br><ul><li>Type: ' + prop.type + '</li>';
            if(prop.computed && prop.computed != "") {
                schemaDefStr += '<li>Computed: ' + prop.computed + '</li>';
            }
            if(prop.format && prop.format != "") {
                schemaDefStr += '<li>Format: ';
                if(typeof(prop.format) == "object") {
                    schemaDefStr += '(';
                    var firsttime = true;
                    for(var key in prop.format) {
                        if(firsttime == false) {
                            schemaDefStr += ', ';
                        }
                        schemaDefStr += capitalize(key) + ': ' + prop.format[key];
                        firsttime = false;
                    }
                    schemaDefStr += ')';
                } else {
                schemaDefStr += prop.format;
                }
                schemaDefStr += '</li>';
            }
            if(prop.label) {
                schemaDefStr += '<li>Label: ' + prop.label + '</li>';
            }
            schemaDefStr += '</ul></div>';
        }
        return schemaDefStr;
    }

    function typeSelect(selected, customID) {
        var types = ["string", "date", "number", "boolean"];
        customID = customID ? customID : "propType";
        var retStr = '<select id="'+ customID +'">';
        for(var key in world.schemas) {
            types.push(key);
        }
        for(var i = 0; i < types.length; i++) {
            retStr += '<option value="' + types[i] + '"';
            if(selected == types[i]) {
                retStr += ' selected="yes" ';
            }
            retStr +='>' + capitalize(types[i]) + '</option>';
        }
        retStr += '</select>';
        return retStr;
    }

    function addNewField(prop) {
        if(prop.computed && prop.format && prop.label) {
            return '';
        }
        if(!prop.computed) {
            var computed = '<option value="computed">Computed</option>';
        } else {
            var computed = '';
        }
        if(!prop.format) {
            var format = '<option value="format">Format</option>';
        } else {
            var format = '';
        }
        if(!prop.label) {
            var label = '<option value="label">Label</option>';
        } else {
            var label = '';
        }

        var retStr = '<li>Add Field: ' + 
                        '<select id="newfield">' +
                            computed +
                            format +
                            label +
                        '</select>' +
                        '<input type="button" value="Add" onclick="editor.addField()" />' +
                    '</li>';
        return retStr;
    }

    function addField() {
        var newfield = $("#newfield").val();
        world.schemas[selectedSchema].properties[editingProp][newfield] = "new" + newfield;
        display();
    }

    /*function displayInstances() {
        $("#instanceBox").empty();
        var instString = "<ol>";
        var query = selectedSchema.query();
        instances = query.fetch();
        for (var i = 0; i < instances.length; i++) {
            var instTitle = instances[i].getTitle();
            if (i == editingInstNum) {
                instString += ('<li><div class="instance"><div ' +
                		'class="editDeleteButtons"><input type="button" ' +
                		'value="Save" onclick="editor.saveInst();" />' + 
                		'<input type="button" value="Reset" ' +
                		'onclick="editor.resetInst();" /></div><h3>' + 
                		instTitle + '</h3><ol>');
                for (var propName in selectedSchema.props) {
                    var prop = selectedSchema.props[propName];
                    if (prop.schemaName == "String" || 
                    		prop.schemaName == "Number") {
                        instString += ('<li>' + prop.name + ':  <input id="' +
                        		propName + 'field" type="textbox" value="' +
                        		instances[i][prop.name] + '" />');
                    }
                    else if (prop.schemaName == "Boolean") {
                        if (instances[i][prop.name] == "True" || 
                        		instances[i][prop.name] == "true") {
                            instString += ('<li>' + prop.name + 
                            		':  <select id="' + propName + 
                            		'field"><option value="True" ' +
                            		'selected="yes">True</option>' +
                            		'<option value="False">False' +
                            		'</option></select>');
                        }
                        if (instances[i][prop.name] == "False" || 
                        		instances[i][prop.name] == "false" || 
                        		instances[i][prop.name] == undefined) {
                            instString += ('<li>' + prop.name + 
                            		':  <select id="' + propName + 
                            		'field"><option value="True">True' +
                            		'</option><option value="False" ' +
                            		'selected="yes">False</option></select>');
                        }
                    }
                    else if (prop.schemaName == "Date") {
                        instString += ('<li>' + prop.name + 
                        		':  Date picker not yet implemented');
                    }
                    else {
                        instString += ('<li>' + prop.name + ':  <select id="' +
                        		propName + 
                        		'field"><option value="undefined">' +
                        		'undefined</option>');
                        for (var targetInst in 
                        		world.schemas[prop.schemaName].instances) {
                            targetTitle = world.schemas[prop.schemaName].instances[targetInst].getTitle();
                            if (instances[i][prop.name] == targetTitle) {
                                instString += ('<option value="' +
                                		targetTitle + '" selected="yes">' + 
                                		targetTitle + '</option>');
                            }
                            else {
                                instString += ('<option value="' + 
                                		targetTitle + '">' + targetTitle +
                                		'</option>');
                            }
                        }
                        instString += ('</select>');
                    }
                }
                instString += ('</ol></div></li>');
            }
            else {
                instString += ('<li><div class="instance"><div ' +
                		'class="editDeleteButtons"><input ' + 
                		'type="button" value="Edit" ' +
                		'onclick="editor.editInst(' + i + ');" />' + 
                		'<input type="button" value="Delete" ' +
                		'onclick="editor.delInst(' + i + 
                		');" /></div><h3>' + instTitle + '</h3><ol>');
                for (var propName in selectedSchema.props) {
                    var prop = selectedSchema.props[propName];
                    instString += ('<li>' + prop.name + ':  ' +
                    		instances[i][prop.name]);
                }
                instString += ('</ol></div></li>');
            }
        }
        instString += ('<br><input type="button" ' +
        		'value="Create New Instance" ' +
        		'onclick="editor.createInst();" />');
        $("#instanceBox").append(instString);
    }*/
    

    
    function createSchema() {
        world.createSchema($("#newSchemaName").val());
        display();
    };
    
    function selectSchema(schemaName) {
        selectedSchema = schemaName;
        editingInstNum = null;
        editingProp = null;
        display();
    };
    
    function deleteSchema() {
        if (selectedSchema instanceof kahnsept.BuiltIn) {
            alert("thats a builtin schema- you can't delete it");
        }
        else {
            world.deleteSchema(selectedSchema.name);
            selectedSchema = world.schemas["Number"];
            display();
        }
    };
    
    function addProp() {
        var newPropName = $("#newPropName").val();
        var newPropSchema = $("#newPropSchema").val();
        var newPropCard = $("#newPropCard").val();
        var newPropDefault = $("#newPropDefault").val();
        selectedSchema.addProperty(newPropName, newPropSchema, 
        		newPropDefault, newPropCard);
        display();
    }
    
    function editProp(propName) {
        editingProp = propName;
        //editingProp.renameProp(propName);
        display();
    };
    function saveProp(oldName) {
        //try {
            var newName = $("#propName").val();
            var thisSchema = world.schemas[selectedSchema];
            if(newName != oldName) {
                thisSchema.properties[newName] = thisSchema.properties[oldName];
                delete thisSchema.properties[oldName];
            }

            if($("#propType").val() != thisSchema.properties[newName].type) {
                thisSchema.properties[newName].type = $("#propType").val();
            }
            if($("#format").val() != thisSchema.properties[newName].format) {
                if($("#format").val() == "" || $("#format").val() == undefined) {
                    delete thisSchema.properties[newName].format;
                } 
                else {
                    thisSchema.properties[newName].format = $("#format").val();
                }
            }
            if($("#computed").val() != thisSchema.properties[newName].computed) {
                if($("#computed").val() == "" || $("#computed").val() == undefined) {
                    delete thisSchema.properties[newName].computed;
                }
                else {
                    thisSchema.properties[newName].computed = $("#computed").val();
                }
            }
            if($("#label").val() != thisSchema.properties[newName].label) {
                if($("#label").val() == "" || $("#label").val() == undefined) {
                    delete thisSchema.properties[newName].label;
                }
                else {
                    thisSchema.properties[newName].label = $("#label").val();
                }
            }
            //console.log(thisSchema.properties[newName]);
            editingProp = null;
            display();
        /*} catch (e) {
            alert(e.message);
        }*/
    };
    function delProp(propName) {
        selectedSchema.deleteProperty(propName);
        display();
    };
    function resetProp() {
        editingProp = null;
        display();
    };
    /*
    function editInst(instNum) {
        editingInstNum = instNum;
        display();
    };
    function delInst(instNum) {
        try {
            if (editingInstNum != null && editingInstNum != instNum) {
                alert('Save your other Instance before deleting this one');
            }
            else {
                instances[instNum].deleteInstance();
                var query = selectedSchema.query();
                instances = query.fetch();
                display();
            }
        } catch (e) {
            alert(e.message);
        }
    };
    function saveInst() {
        try {
            if (editingInstNum != null) {
                for (var prop in selectedSchema.props) {
                    instances[editingInstNum][prop] = $("#" + 
                    		prop + "field").val();
                }
                editingInstNum = null;
                display();
            }
        } catch (e) {
            alert(e.message);
        }
    };
    function resetInst() {
        editingInstNum = null;
        display();
    }
    function createInst() {
        try {
            saveInst();
            editingInstNum = instances.length;
            selectedSchema.createInstance();
            display();
        } catch (e) {
            alert(e.message);
        }
    }*/

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    ns.extend({
        'loadDatabase': loadDatabase,
        'onReady': onReady,
        'createSchema': createSchema,
        'selectSchema': selectSchema,
        'deleteSchema': deleteSchema,
        'addProp': addProp,
        'editProp': editProp,
        'saveProp': saveProp,
        'delProp': delProp,
        'resetProp': resetProp,
        'addField': addField/*,
        'editInst': editInst,
        'delInst': delInst,
        'saveInst': saveInst,
        'resetInst': resetInst,
        'createInst': createInst*/
    });
});
