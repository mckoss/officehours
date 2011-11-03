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
        
	    var dropDownStr = '<select id="newPropSchema">';
	    for (var key in world.schemas) {
	        var schema = world.schemas[key];
	        dropDownStr += ('<option value="' + schema.name + '">' + 
	        		schema.name + '</option>');
	    }
	    dropDownStr += '</select>';
	    $("#schemaDefinition").append('<div class="schemaDefinitionLine">' +
	    		'newPropName: <input type="textbox" id="newPropName" '+
	    		'style="width:100px;">' + ' Type: ' + dropDownStr +
	    		' Card:<select id="newPropCard" style="width:50px;">' +
	    		'<option value="one">one</option><option value="many">' + 
	    		'many</option></select> Default: <input type="textbox" ' +
	    		'id="newPropDefault">' + '<input type="button" ' +
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
                'Property Name: <input type="textbox" value="' +
                propName +
                '" id="propName" />Type: ' + typeSelect(prop.type);
            /*    ' Card: <select id="propCard">';

            if (prop.card == "one") {
                schemaDefStr += '<option value="one" selected="yes">' +
                    'one</option><option value="many">many</option>';
            }
            else if (prop.card == "many") {
                schemaDefStr += '<option value="one">one</option>' +
                    '<option value="many" selected="yes">many</option>';
            }
            schemaDefStr += ('</select>Default:');*/
            if (prop.type == "string" ||
                prop.type == "number" ||
                prop.type == "date") {
                schemaDefStr += '<input type="textbox" value="' +
                    /*prop.defaultValue + */'" id="propDefault" />';
            }
            else if (prop.type == "boolean") {
                if (prop.defaultValue == "True" ||
                    prop.defaultValue == "true") {
                    schemaDefStr += '<select id="propDefault">' +
                        '<option value="True" selected="yes">' +
                        'True</option>' +
                        '<option value="False">False</option></select>';
                }
                if (prop.defaultValue == "False" ||
                    prop.defaultValue == "false" ||
                    prop.defaultValue == undefined) {
                    schemaDefStr += '<select id="propDefault">' +
                        '<option value="True">True</option>' +
                        '<option value="False"' +
                        'selected="yes">False</option></select>';
                }
            }/* TODO- Schema default select
            else {
                schemaDefStr += '<select id="propDefault">' +
                    '<option value="undefined">undefined</option>';
                base.forEach(
                    world.schemas[prop.schemaName].instances,
                    function(inst) {
                        var targetTitle = inst.getTitle();
                        if (prop.defaultValue == targetTitle) {
                            schemaDefStr += '<option value="' +
                                targetTitle +
                                '" selected="yes">' +
                                targetTitle +
                                '</option>';
                        }
                        else {
                            schemaDefStr += '<option value="' +
                                targetTitle +
                                '">' +
                                targetTitle +
                                '</option>';
                        }
                    });
                schemaDefStr += ('</select>');
            }*/
            schemaDefStr += '<div class="editDeleteButtons">' +
                '<input type="button" value="Save" ' + 
                'onclick="editor.saveProp(\'' + propName + 
                '\');" /><input type="button" value="Reset"' +
                'onclick="editor.resetProp();" /></div></div>';
        }
        else {
            schemaDefStr += '<div class="schemaDefinitionLine">' + 
                    capitalize(propName) + ' : ' + prop.type;
            if(prop.label) {
                schemaDefStr += ', Label: ' + prop.label + ' ';
            }

            schemaDefStr += '<div class="editDeleteButtons"><input type="button"' +
                    'value="Edit" onclick="editor.editProp(\'' + 
                    propName + '\');" /><input type="button" ' + 
                    'value="Delete" onclick="editor.delProp(\'' + 
                    propName + '\');" /></div></div>';
        }
        return schemaDefStr;
    }

    function typeSelect(selected) {
        var types = ["string", "date", "number", "boolean"];
        var retStr = '<select id="propType">';
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
        return retStr;
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
        try {
            var newName = $("#propName").val();
            var thisSchema = world.schemas[selectedSchema]
            if(newName != oldName) {
                thisSchema.properties[newName] = thisSchema.properties[oldName];
                delete thisSchema.properties[oldName];
            }
            console.log([$("#propType").val(), thisSchema.properties[newName].type]);
            if($("#propType").val() != thisSchema.properties[newName].type) {
                thisSchema.properties[newName].type = $("#propType").val();
                console.log(thisSchema.properties[newName].type);
            }
            //console.log(thisSchema.properties[newName]);
            editingProp = null;
            display();
        } catch (e) {
            alert(e.message);
        }
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
        'resetProp': resetProp/*,
        'editInst': editInst,
        'delInst': delInst,
        'saveInst': saveInst,
        'resetInst': resetInst,
        'createInst': createInst*/
    });
});
