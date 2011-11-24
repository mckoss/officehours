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
    var selectedPage = null;
    var editingProp = null;
    var editingInstNum = null;
    var instances = [];

    function loadDatabase(json) {
        //selectedSchema = "users";
    }

    function onReady() {
    $.ajax({
        url: "/officehours-app2.js",
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
        displayPageSchemaList();
        if(selectedSchema) {
            displaySchemaDefinition();
        }
        if(selectedPage) {
            displayPageDefinition();
        }
        //displayInstances();
    };

    function validateData() {
        if(selectedSchema == null && selectedPage == null){
            console.log("ERROR: no schema or page selected, should be one or other");
        }
        if(selectedSchema != null && selectedPage != null){
            console.log("ERROR: both schema or page selected, should be one or other");
        }
        if(selectedSchema != null && !world.schemas[selectedSchema]) {
            console.log("ERROR: selected schema " + selectedSchema + 
                        " does not exist in the data model");
        }
        if(selectedPage != null && !world.pages[selectedPage]) {
            console.log("ERROR: selected page " + selectedPage + 
                        " does not exist in the data model");
        }

        for(var key in world.pages) {
            if(!world.pages[key].title) {
                console.log("ERROR: all pages must have a title, " + key + "does not.");
            }
        }
    }


    function displayPageSchemaList() {
        //Schema List
        var htmlStr = '<h3>Schema List</h3>';
        for(var key in world.schemas) {
            var schema = world.schemas[key];
            if (key == selectedSchema) {
                htmlStr += '<li>' + capitalize(key) + '</li>';
            }
            else {
                 htmlStr += '<li><a href="#" onclick="editor.selectSchema(\'' +
                           key + '\');">' + capitalize(key) + '</a></li>';
            }
        }

         htmlStr +='<input type="textbox" id="newSchemaName"' +
                   ' value="newSchemaName" /><br>' +
                   '<input type="button" value="Create"' +
                   ' onclick="editor.createSchema();" />';
        //Special Pages
         htmlStr += '<h3>Special Pages</h3>';
         for(key in world.pages) {
            if (key == selectedPage) {
                htmlStr += '<li>' + capitalize(key) + '</li>';
            }
            else {
                 htmlStr += '<li><a href="#" onclick="editor.selectPage(\'' +
                           key + '\');">' + capitalize(key) + '</a></li>';
            }             
         }
        htmlStr +='<input type="textbox" id="newPageName"' +
                   ' value="newPageName" /><br>' +
                   '<input type="button" value="Create"' +
                   ' onclick="editor.createPage();" />';        
        htmlStr += '<br><br><br><input type="button" value="Export Data" onclick="' +
                    'editor.exportData()" />';
        $("#pageSchemaList").html(htmlStr);
            
    }

    function setTitleBar(selected) {
        $("#defTitle").html('<h3 style="width:750px; height:45px; float:left;">' +
               capitalize(selected) + ' Definition</h3>' +
               '<div style="float:left; margin-top:15px;">' +
               '<input type="button" value="Delete" ' +
               'onclick="editor.deleteSchema();" /></div>');
    }


    function displaySchemaDefinition() {

    	setTitleBar(selectedSchema);

        var thisSchema = world.schemas[selectedSchema];

        var schemaDefStr = ""

	    for (var propName in thisSchema.properties) {
            schemaDefStr += displayProp(propName);
	    }
        $("#propertyBox").html(schemaDefStr);
        
	    $("#propertyBox").append('<div class="propertyBoxLine">' +
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
            schemaDefStr += '<div class="propertyBoxLine">';
            schemaDefStr += '<div class="editDeleteButtons">' +
                                '<input type="button" value="Save" ' + 
                                'onclick="editor.saveProp(\'' + propName + 
                                 '\');" /><input type="button" value="Reset"' +
                                'onclick="editor.resetProp();" />' +
                            '</div>' +
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
            schemaDefStr += '</div>';
        }
        else {
            //READ MODE
            schemaDefStr += '<div class="propertyBoxLine">';
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
    
    function createSchema() {
        world.schemas[$("#newSchemaName").val()] = {"properties": {"title": {}}};
        selectedSchema = $("#newSchemaName").val();
        display();
    };
    
    function selectSchema(schemaName) {
        selectedSchema = schemaName;
        selectedPage = null;
        editingInstNum = null;
        editingProp = null;
        display();
    };
    
    function deleteSchema() {
        confirm("Are you sure you want to delete this schema?");
        delete world.schemas[selectedSchema];
        display();
    };
    
    function addProp() {
        var newPropName = $("#newPropName").val();
        var newPropSchema = $("#newPropSchema").val();
        if(newPropName == undefined || newPropName == "") {
            alert("You must specify a name for this property");
            return;
        }
        if(hasSpaces(newPropName)) {
            alert("Property Names cannot contain spaces");
            return;
        }
        world.schemas[selectedSchema].properties[newPropName] = {type: newPropSchema};
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

    function selectPage(pageName) {
        selectedPage = pageName;
        selectedSchema = null;
        editingInstNum = null;
        editingProp = null;
        display();
    }

    function displayPageDefinition() {
        setTitleBar(selectedPage);
        var thisPage = world.pages[selectedPage];

        var buttonStr = '';
        if(thisPage.toolbar) {
            for(var key in thisPage.toolbar) {
                buttonStr += displayToolbarButton(key);
            }            
        } else {
            buttonStr += 'None';
        }
        buttonStr += '<input type="button" value="Add another Button" ' + 
                        'onclick="editor.addButton()" />';

        var pageElements = '';
        for(var i = 0; i < thisPage.elements.length; i++) {
            pageElements += displayPageElement(i);
        }
        pageElements += 'New Element: ' +
                        '<select id="newPageEle">' +
                            '<option value="view">Data List</option>' +
                            '<option value="command">Button</option>' +
                            '<option value="link">Link</option>' +
                        '</select>' +
                        '<input type="button" value="Add" onclick="editor.addPageElement()" />';


        var defStr = '<div class="propertyBoxLine">' +
                        '<strong>Page Title: </strong>' +
                        '<input type="text" value="' + thisPage.title + 
                            '" id="pageTitle" />' +
                        '</div>' +
                    '<div class="propertyBoxLine">' +
                        '<strong>Toolbar Buttons: </strong><br><br>' +
                        buttonStr +
                    '</div>' + 
                    '<div class="propertyBoxLine">' +
                        '<strong>Page Elements: </strong><br><br>' +
                        pageElements +
                    '</div>';
        $("#propertyBox").html(defStr);
    }

    function displayToolbarButton(key) {
        var thisButton = world.pages[selectedPage].toolbar[key];
        var retStr = '<div class="editDeleteButtons"><input type="button"' +
                    'value="Edit" onclick="editor.editToolbar(\'' + 
                    key + '\');" /><input type="button" ' + 
                    'value="Delete" onclick="editor.delToolbar(\'' + 
                    key + '\');" /></div>';
        retStr += '<strong>' + key + ': </strong><br><ul>' + 
                        '<li>Label: ' + thisButton.label + '</li>' +
                        '<li>Condition: ' + thisButton.condition + '</li>' +
                        '<li>Onclick: ' + thisButton.onclick + '</li>' +
                        '</ul>';
        return retStr;
        
    }

    function editToolbar(key) {
        
    }

    function displayPageElement(pos) {
        var thisEle = world.pages[selectedPage].elements[pos];
        var retStr = '';
        if(thisEle.list) {
            retStr += 'Data List: <br><ul>' + 
                        '<li>Schema: ' + thisEle.schema + '</li>' +
                        '<li>Filter: ' + thisEle.list + '</li>' +
                        '</ul>';
        }
        if(thisEle.command) {
            retStr += 'Button: <br><ul>' + 
                        '<li>Schema: ' + thisEle.schema + '</li>' +
                        '<li>Command: ' + thisEle.command + '</li>' +
                        '</ul>';
        }        
        if(thisEle.link) {
            retStr += 'Link: <br><ul>' + 
                        '<li>Target: ' + thisEle.link + '</li>' +
                        '</ul>';
        }
        return retStr;
    }

    function addPageElement() {
        alert("worked");
    }

    function exportData() {
        jsonStr = JSON.stringify(world);
        console.log(world);
        console.log(jsonStr);
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function hasSpaces(str){
        if(str.search(/\s/) == -1) {
            return false;
        }
        else {
            return true;
        }
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
        'addField': addField,
        'exportData': exportData, 
        'selectPage': selectPage,
        'addPageElement': addPageElement/*,
        'editInst': editInst,
        'delInst': delInst,
        'saveInst': saveInst,
        'resetInst': resetInst,
        'createInst': createInst*/
    });
});

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


    /*function jsonToString(obj) {
        var retStr = '{';
        var items = [];
        for(var key in obj) {
            var itemStr = key + ": ";
            if(typeof(obj[key]) == "string" ||
                typeof(obj[key]) == "number" ||
                typeof(obj[key]) == "boolean") {
                itemStr += '"' + obj[key] + '"';
            }
            else {
                if(Object.prototype.toString.call(obj[key]) === '[object Array]' ){
                    itemStr += '[';
                    var elements = [];
                    for(var i = 0; i < obj[key].length; i++) {
                        if(typeof(obj[key][i]) === "string") {
                            elements.push('"' + obj[key][i] + '"'); 
                        } else {
                            elements.push(jsonToString(obj[key][i]));
                        }
                    }
                    itemStr += elements.join(", ") + ']';         
                }
                else if(Object.prototype.toString.call(obj[key]) === '[object Object]' ){
                    itemStr += jsonToString(obj[key]);
                }
                else if(Object.prototype.toString.call(obj[key]) === '[object Function]') {
                    console.log("Error: there should not be a function in this");
                    console.log([key, obj]);
                } else {
                    console.log("Error: how did you get here?");
                    console.log([key, obj]);
                }
            }
            items.push(itemStr);
        }
        retStr += items.join(', ') + '}';
        return retStr;
    }*/
