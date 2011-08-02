namespace.lookup('com.pageforest.officehours').defineOnce(function (ns) {
    var clientLib = namespace.lookup('com.pageforest.client');
    var base = namespace.lookup('org.startpad.base');
    var client;
    var textCutoff = 30; //This is the length at which a textarea will be displayed instead of a text input
    var currentYear = 2011;
    var wholeDoc = namespace.lookup('com.pageforest.officehours.sample-data').wholeDoc;


    var location = "StartPad";

    function onReady() {
        // Client library for Pageforest
        client = new clientLib.Client(ns);
        client.poll();

        //$('#newSession').submit(onNewSession);
    }


    function setDoc(stuff) {
        //client.log("stuff:" + stuff);
        $('#location-name').text(wholeDoc.title);
        var sessions = getSessions(location);

        updatePages();
        //sessionBuilder(sessions);

        myAppointments(sessions);


    }


    function getDoc() {
        return wholeDoc;
    }

    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


    /*  updatePages()
        Calls for a page to be built for each instance of each schema.
        (ignores special schema 'instructions').
        Calls buildPage(dataType, key) sending dataType (what schema) and key (which instance of that schema to build)
        Calls buildPage for edit page if signed in and owner of instance
    */
    function updatePages() {
        buildPage("home", "all");

        for (var schema in wholeDoc.blob) {
            if (schema != "instructions") {
                for (var key in wholeDoc.blob[schema]) {
                    buildPage("" + schema, key);
                    var owner = wholeDoc.blob.instructions[schema].settings.owner;
                    if (wholeDoc.blob[schema][key][owner] == client.username && schema != "reservations")
                        buildPage("" + schema, key, "edit");
                }
            }
        }

    }

    /*  buildPage(pageType, key)
        calls genPageHTML (pageType, key, style) (style is optional indication to build edit, rather than view)
        which returns HTML for referenced page. Once HTML returned, it is pushed to proper place to either create
        or update the page.
    */
    function buildPage(pageType, key, style) {
        var html = "";
        var pageId = "";


        if(key[1] != undefined) {
            i = key[0];
            var j = key[1];

        }
        //client.log("pagetype: " + pageType + " key: " + key + " i:" + i + " j:" + j );
        if (style == undefined)
            style = "display";

        pageId = key;
        if(style == "edit")
            pageId += "edit";

        if (pageType == "home") {
            pageId = "home";
            html = homeHTML();
        } else
            html = genPageHTML(pageType, key, style);

        if($("#"+pageId).length == 0) {
            html = '<div id="' + pageId + '">' + html + '</div>';
            $("#jqt").append(html);
        }
        else {
            $("#"+pageId).html(html);
        }
    }

    /* genPageHTML(pageType, key, style)
       Grabs display instructions from instructions[dataType].settings[pageEdit or pageDisplay]
       This is an ordered list of elements.
       Then, calls genElementHTML for each element in instruction array and returns concatenated html.
    */
    function genPageHTML(pageType, key, style) {
        var html = "";
        if (style == "edit")
            var display =wholeDoc.blob.instructions[pageType].settings.pageEdit;
        else {
            var display = wholeDoc.blob.instructions[pageType].settings.pageDisplay;
            style = "display";
        }
        for(var i = 0; i < display.length ; i++) {
            html += genElementHTML(display[i], pageType, key, style);
        }
        return html;
    }

    /* genElementHTML(dataArray, dataType, key, style)
       builds an element based on instructions given
       dataArray[0] indicates the type of element to build.
       (can be "condition" for switch)
       subsequent array elements define how that element type should be created.
       Passes all display instructions to unique element builder
    */
    function genElementHTML(dataArray, dataType, key, style) {
        var html = "";
        //console.log(dataArray, dataType, key);
        var contentType = dataArray[0];
        if (contentType == "condition") {
            if (checkCondition(dataArray[1], [dataType, key])){
                html += genElementHTML(dataArray[2], dataType, key, style);
            }
        } else if (contentType == "ul") {
            html += genUlHTML(dataType, key, style, dataArray[1].lines);
        } else if (contentType == "h2") {
            html += "<h2>" + dataArray[1] + "</h2>";
        } else if (contentType == "link") {
            html += '<ul class="rounded"><li class="arrow"><a href="#' +
                dataArray[1] + '">' + dataArray[2] + '</a></li></ul>';
        } else if (contentType == "button") {
            html += buttonHTML(dataArray[3], dataArray[1], dataArray[2], dataType, key);
        } else if (contentType == "toolbar") {
            html += genToolbarHTML(dataArray[1], dataArray[2], dataArray[3], key, dataType);
        } else {
            console.log("genElementHTML error: contentType not recognized");
        }
        return html;
    }





    function homeHTML () {
        var html = '';
        var buttons = [];
        var myAppts = '';
        if (client.username == undefined)
            buttons.push({text:"Sign In", href:"", funct:"officehours.signIn();"});
        else {
            buttons.push({text: client.username, href: client.username});
            myAppts = '<ul class="rounded"><li class="arrow"><a href="#myappt">My Appointments</a></li></ul>';
        }
        html += toolbarHTML(wholeDoc.title, buttons) + '<h2 style="text-align:center">Office Hours</h2>';
        html += genUlHTML("sessions", "all", "display");
        html += buttonHTML("Host an Office Hour", "newSession");
        html += myAppts;
        return html;
    }


    function genUlHTML (dataType, key, style, lines) {
        /* generates a UL with data within scope

           arguments
           dataType: what kind of data
           key: name in dataType's namespace
           style: "display" or "edit"

           ulClass -  used for JQTouch display, default to rounded
        */

        var ulClass = "rounded";
        if (style == undefined)
            style = "display";


        var html = '<ul class="' + ulClass + '">';
        var instructions = wholeDoc.blob.instructions[dataType];

        if(key == "all") { //For building home sessions
            var target = wholeDoc.blob[dataType];
            for(var id in target) {
                html += genLineHTML({"dataType": dataType, "value": id, "label": "nolabel", "style": "display", "link": id});
            }
        } else {
            var target = wholeDoc.blob[dataType][key];

            for (var pos = 0; pos < lines.length; pos++) {
                for (var i = 0; i < instructions.attr.length; i++) {
                    var attr = instructions.attr[i];
                    if (attr.dataField == lines[pos]) {

                        if (!(attr.editable == false && style == "edit") &&
                            !(attr.display == "h1text" && style == "display") &&
                            (attr.display != "nodisplay")) {
                            var temp = "" + attr.dataField + "";
                            var value = target[temp];
                            var label = attr.fieldName;
                            var link = "nolink";
                            if (attr.display == "nolabel")
                                label = "nolabel";
                            if ((attr.dataType != "string" && attr.dataType != "time" &&
                                 attr.dataType != "date" && attr.dataType != "textarea") &&
                                style == "display") {
                                link = value;
                                //value = target;
                                //console.log("customdata value: " + value);
                            }
                            if (attr.linked != undefined && attr.linked == "nolink") {
                                link = "nolink";
                                //console.log("temp: " + attr.linked +" link: " + link);
                            }

                            html += genLineHTML({"dataType": attr.dataType, "value": value,
                                                 "label": label, "style": style, "id": key + "-" + attr.dataField, "link": link});
                        }
                    }
                }
            }

        }

        html += '</ul>';
        //console.log("genUlHTML returns: " + html);
        return html;

    }

    function genLineHTML(line) {
        /* This function is the generate the contents of a single line item.
           It accepts JSON object with
           dataType (string, date, sessions),
           value,
           label,
           rows,
           id, - for saving data out of editable fields
           style: (display/edit), and
           link (if it is to be hyperlnked)
        */


        var html = '<li';

        if (line.dataType == "textarea" && line.style == "display")
            html += '>' + line.value;
        else {
            if (line.link && line.link != "nolink")
                html += ' class="arrow"><a href="#' + line.link + '">';
            else
                html += '>';

            if(line.label && line.label != undefined && line.label != "nolabel")
                html += '<label style="float:left">' + line.label + ':</label>';

            html += valueHTML(line.dataType, line.value, line.style, line.id);

            if (line.link)
                html += '</a>';

        }

        return html + '</li>';
    }

    function shuffleTemplates (templates, data) {
        //Shuffle in terms of perfect shuffle, interlaces template arrays
        var html = '';
        var str = '';
        //console.log("shuffletemp: " + eval("data.title"));
        for (var i = 0; i < templates[0].length; i++) {
            html += templates[0][i];
            if (templates[1][i]) {
                str = "" + templates[1][i] + "";
                //console.log("str: " + str + " exists: " + data);
                if (wholeDoc.blob[str]) {
                    //console.log({"da str": str, "data": data});
                    html += valueHTML(str, data[str], "display");
                }
                else {
                    //console.log({"str": str, "data": data});

                    var logme = valueHTML(str, data[str], "display");
                    //console.log(logme);
                    html += logme;
                }
            }

        }
        return html;
    }

    function valueHTML(dataType, value, style, id) {
        /*Converts value to dataTyped HTML view, calls self recursively for data objects
          args:
          dataType: string,date,time,textarea or data obj type
          value: one of above or reference to data obj type
          style: display/edit
          id: id to save editable fields
        */
        var html = '';

        if (style == "edit") {
            if (dataType == "string" || dataType == "textarea") {
                if (value.length < textCutoff) {
                    html += '<input type="text" id="' + id +'" value="' +
                        value + '" style="width:100%" />';
                }
                else {
                    html += '<textarea rows="2" style="width:100%" id="' + id +
                        '">' + value + '</textarea>';
                }
            }
            else if (dataType == "time") {
                html += timeHTML(id, value);
            }
            else if (dataType == "date") {
                html += editDateHTML(id, value);
            }
            else if (wholeDoc.blob[dataType]) {
                console.log("valueHTML ERROR: shouldn't be entire editing data objects with single form field, dataType: " + dataType);
            } else {
                //var instLoc = wholeDoc.blob.instructions[dataType];

                console.log({"dataType": dataType, "val": value});
                html += 9;
            }
        }
        else if (style == "display") {
            if (dataType == "string")
                html += value;
            else if (dataType == "date") {
                html += months[value.getMonth()] + ' ' + value.getDate();
            } else if (dataType == "time")
                html += getTime(value);
            else if (wholeDoc.blob[dataType]) {

                var temp = wholeDoc.blob[dataType];
                var temp2 = wholeDoc.blob.instructions[dataType];
                if (temp2 == "status")
                    console.log("Rez hit");

                //console.log({"dataType": dataType, "val": value, "temp": temp,
                //"temp2": temp2, "templates": 0, "data": 0});
                var temp3 = temp2.settings.lineDisplay;
                //console.log("complex output: " + shuffleTemplates(temp3, temp[value]));
                html += shuffleTemplates(temp3, temp[value]);
            }else {
                html += value;
            }
        } else {
            console.log("valueHTML error: call not understood: neither edit nor display");
        }
        return html;
    }

    function genToolbarHTML(title, button1, button2, id, dataType) {
        if (typeof(title) == "object") {
            if(title[0] == "value")
                title = wholeDoc.blob[dataType][id][title[1]];
        }
        var html = '<div class="toolbar">' +
            '<h1>' + title + '</h1>';
        if(button2)
            var buttons = [button1, button2];
        else
            var buttons = [button1];
        for (i=0; i < buttons.length; i++) {
            if (i == 0)
                var slide = "slideleft";
            else
                var slide = "slideright";

            var buttonType = buttons[i][0];

            if (buttonType == "condition") {
                if (checkCondition(buttons[i][1], [dataType, id]))
                    buttonType = buttons[i][2];


                //console.log(["condition output", buttonType]);
            }


            var buttontype = "button";
            /*if (buttons[i].text == "Save")
              buttontype = "saveButton";*/
            //console.log([typeof(buttons[i][0]), buttons[i][0]]);

            if(buttonType == "back" || buttons[i].funct == "back") {
                var buttonText = "Back";
                //if (buttons[i].text)
                //buttonText = buttons[i].text;
                html += '<a href="#" class="back">' + buttonText + '</a>';
            } else if (buttonType == "edit") {
                html +='<a href="#' + id + 'edit" class="button slideright">Edit</a>';
            } else if (buttonType == "save") {
                html +='<a  onclick="officehours.saveData(\''+id+'\',\''+dataType+'\',\''+id+'\')" class="button slide reverse">Save</a>';
            }
            //html += '<a href="#' + buttons[i].href + '" class="' + buttontype + ' ' + slide + '" onclick="' +
            //buttons[i].funct+ '" >' + buttons[i].text + '</a>';
            //}
        }

        html += '</div>';
        return html;
    }

    function toolbarHTML(h1txt, buttons) {
        // buttons is an array of the buttons.  accepts either "back" or JSON object with text, href and funct
        var html = '<div class="toolbar">' +
            '<h1>' + h1txt + '</h1>';

        for (i=0; i < buttons.length; i++) {
            if (i == 0)
                var slide = "slideleft";
            else
                var slide = "slideright";

            var buttontype = "button";
            /*if (buttons[i].text == "Save")
              buttontype = "saveButton";*/

            if(buttons[i] == "back" || buttons[i].funct == "back")
                html += '<a href="#" class="back">' + buttons[i].text+ '</a>';
            else if(buttons[i] == "save" || buttons[i].funct == "save")
                html += '<a href="#" onclick="">' + buttons[i].text+ '</a>';
            else {
                html += '<a href="#' + buttons[i].href + '" class="' + buttontype + ' ' + slide + '" onclick="' +
                    buttons[i].funct+ '" >' + buttons[i].text + '</a>';
            }
        }

        html += '</div>';
        return html;
    }



    function buttonHTML(text, href, funct, dataType, key) {
        if(typeof(funct) == "object") {
            if (funct[0] == "set")
                funct = "officehours.setData('"+dataType+"','"+key+"','"+funct[1]+"','"+eval(funct[2])+"','"+funct[3]+"')";
            else if (funct[0] =="delete")
                funct = "officehours.deleteData('"+dataType+"','"+key+"','"+funct[1]+"','"+eval(funct[2])+"','"+funct[3]+"')";
        }
        var html = '<a href="#' + href + '" onclick="' + funct +  '" class="whiteButton">' +
            text +'</a>';
        return html;
    }

    function isOwned(dataType, key) {
        var type = wholeDoc.blob[dataType];
        var target = type[key];
        var instructions = wholeDoc.blob.instructions[dataType];
        var owner = instructions.settings.owner;
        if (target[owner] == client.username)
            return true;
        else
            return false;

    }

    function checkCondition(condition, arg) {
        var not = false;
        condition = "" + condition;
        if(condition.charAt(0) == "n" &&
           condition.charAt(1) == "o" &&
           condition.charAt(2) == "t") {
            not = true;
            console.log(condition);
            condition = condition.substr(3);
            console.log(condition);
        }
        var result = false;

        if(eval(wholeDoc.blob.instructions.condition[condition]))
            result =  true;

        // console.log("not: " + not + " result" + result + "output: " + ( not ? !result : result ) + " condition: " + condition);

        if( not ? !result : result ) {
            return true;
        }
        else {
            return false;
        }
    }

    function saveData (id, dataType, goPage) {
        if (goPage == undefined)
            goPage = id;
        var instructions = wholeDoc.blob.instructions[dataType];
        var target = wholeDoc.blob[dataType][id];
        //console.log({"id": id, "dataType": dataType, "target": target});

        for (var i = 0; i < instructions.attr.length; i++) {
            if($('#' + id + '-' + instructions.attr[i].dataField).attr("value"))
                target[instructions.attr[i].dataField] = $('#' + id + '-' + instructions.attr[i].dataField).attr("value");
            if(instructions.attr[i].dataField == "date") {
                var month = $('#' + id + '-date-m').attr("value");
                var day = $('#' + id + '-date-d').attr("value");
                target["date"] = new Date(currentYear, month, day);
                //console.log({"day": day, "month": month, "target[date]": target["date"]});
            }

        }
        //console.log ({"id": id, "dataType": dataType, "target": target});
        client.setDirty();
        updatePages();
        jQT.goTo('#' + goPage);
    }

    function setData(dataType, key, dataField, value, goPage) {
        console.log('set');
        var dType = wholeDoc.blob[dataType];
        var target = dType[key];
        target[dataField] = value;
        console.log(target);
        client.setDirty();
        updatePages();
        jQT.goTo('#' + goPage);
    }

    function deleteData(a1, a2, a3, a4, a5) {
        console.log("deleteData: a1: " + a1 + ", a2:" + a2 + ", a3:" + a3 + ", a4:" + a4 + ", a5:" + a5);
        delete wholeDoc.blob[a1][a2];
        jQT.goTo('#home');
        updatePages();
    }

    function onUserChange(username) {
        //alert(username);
        $('#homeSignIn').html('<a class="button slideleft" id="saveButton" href="#myProfile">'+ username +'</a>');
    }

    function myAppointments(sessions) {
        var html = '';
        for(var key in sessions) {
            if(sessions[key].provider == client.username) {
                html += '<li class="arrow">' +
                    '<a href="#' + sessions[key].id +'">' + sessions[key].title +
                    ' <br/>' + userToFullname(sessions[key].provider) + ' - ' +
                    months[sessions[key].date.getMonth()] + ' ' +
                    sessions[key].date.getDate() +
                    ' - ' + getTime(sessions[key].time) +
                    '</a></li>';
            }
            for(var i = 0; i < 4; i++) {
                if(sessions[key].reservation[i] == client.username) {
                    html += '<li class="arrow">' +
                        '<a href="#' + sessions[key].id +'">' + sessions[key].title +
                        ' <br/>' + userToFullname(sessions[key].provider) + ' - ' +
                        months[sessions[key].date.getMonth()] + ' ' +
                        sessions[key].date.getDate() +
                        ' - ' + getSeshTime(sessions[key].time, i) +
                        '</a></li>';
                }
            }
        }

        $('#myAppts').html(html);
    }




    function saveNewSession() {
        var seshTitle = $('#seshTitle').attr("value");
        var seshDesc = $('#seshDesc').attr("value");
        var month = $('#seshDate-m').attr("value");
        var day = $('#seshDate-d').attr("value");
        var seshDate = new Date(currentYear, month, day);
        //var seshDate = new Date($('#seshDate').attr("value"));
        var seshTime = $('#seshTime').attr("value");
        var newId = client.username + '-' + base.randomInt(10000);
        var newSesh = {
            id: newId,
            title: seshTitle,
            description: seshDesc,
            provider: client.username,
            date: seshDate,
            time: seshTime,
            "reservation-0": newId + "-0",
            "reservation-1": newId + "-1",
            "reservation-2": newId + "-2",
            "reservation-3": newId + "-3"
        };
        client.log(newSesh);
        wholeDoc.blob.sessions[newSesh.id] = newSesh;
        wholeDoc.blob.reservations[newSesh.id+"-0"]=  {status: "Available", time: "11 :00AM - 11:30AM", parent: newId, owner: client.username};
        wholeDoc.blob.reservations[newSesh.id+"-1"]=  {status: "Available", time: "11 :00AM - 11:30AM", parent: newId, owner: client.username};
        wholeDoc.blob.reservations[newSesh.id+"-2"]=  {status: "Available", time: "11 :00AM - 11:30AM", parent: newId, owner: client.username};
        wholeDoc.blob.reservations[newSesh.id+"-3"]=  {status: "Available", time: "11 :00AM - 11:30AM", parent: newId, owner: client.username};

        //client.log(wholeDoc.blob.sessions);
        client.log(wholeDoc.blob.reservations);
        client.setDirty();
        updatePages();
        jQT.goTo('#home');

    }

    function cancelSession(key) {
        client.log("CANCEL: " + key);
        wholeDoc.blob.sessions.splice(key, 1);
        updatePages();
        client.setDirty();
        jQT.goTo("#home");
    }


    function signOut() {
        client.log(client.signOut());

    }

    function signIn() {
        client.signIn();

    }

    function editSession() {

    }

    function onUserChange() {
        updatePages();
    }

    function getDocid() {
        return "Startpad";
    }

    function setDocid() {

    }

    // Stub to get data from pageforest
    function getSessions(location) {
        var json =
            [
                {
                    id: "cwkoss-123",
                    title: "Using JQTouch for Mobile Apps",
                    description: "This is a great session where you will learn lots of stuff about JQTouch.",
                    provider: "cwkoss",
                    date: new Date("1/1/2011"),
                    time: 11,
                    reservation: ["Available" , "mckoss", "bobby", "Available"]
                },
                {
                    id: "bobby-124",
                    title: "pwning Friends at Quoridor",
                    description: "Quoridor is a game that is most fun when you make your friends most frustrated.",
                    provider: "bobby",
                    date: new Date("1/11/2011"),
                    time: 15,
                    reservation: ["cwkoss" , "mckoss" , "Cancelled" , "Cancelled"]
                },
                {
                    id: "mckoss-8977",
                    title: "Angry Birds as Stress Relief",
                    description: "Get the pigs!  They have taken our eggs! Learn about angles and when to tap the screen.",
                    provider: "mckoss",
                    date: new Date("1/15/2011"),
                    time: 14,
                    reservation: ["Available" , "Available" , "bobby" , "cwkoss"]
                }
            ];
        return json;
    }





    function userToFullname(username) {
        for (var key in wholeDoc.blob.users) {
            if (wholeDoc.blob.users[key].username == username)
                return wholeDoc.blob.users[key].fullname;

        }
    }

    function timeSelect(time) {


        var html = '<select>';
        for(i = 0; i < times.length; i++) {
            if(time == i)
                html += '<option value="' + i +'" selected ="yes">' + times[i] + '</option>';
            else
                html += '<option value="' + i +'">' + times[i] + '</option>';

        }
        html += '</select>';

        alert("hi");
        return html;
    }

    function getTime(key) {
        if (key[1])
            return rezTime(key);

        key = key % 24;
        var noon = (key % 12);
        if (noon == 0)
            noon = 12;

        var str = "" + noon + " ";
        if(key < 12 || key > 23)
            str += ":00AM - ";
        else
            str += ":00PM - ";

        noon = ((key+2)%12);
        if (noon == 0)
            noon = 12;
        str += noon;
        if((key + 2) < 12 || (key + 2) > 23)
            str += ":00AM";
        else
            str += ":00PM";

        return str;
    }
    function rezTime(key) {
        return getSeshTime(key[0], key[1]);
    }

    function getSeshTime(time, rez) {
        if(rez > 1)
            time++;

        var str = "";

        if (time == 12 || time == 0)
            str += '12';
        else
            str += (time % 12);

        if(rez % 2 == 0)
            str += ":00";
        else
            str += ":30";


        if(time < 12 || time > 23)
            str += "AM - ";
        else
            str += "PM - ";

        if(rez % 2 == 1)
            time++;

        if (time == 12 || time == 0)
            str += '12';
        else
            str += (time % 12);

        if(rez % 2 == 1)
            str += ":00";
        else {
            str += ":30";
        }

        if(time < 12 || time > 23)
            str += "AM";
        else
            str += "PM";

        return str;
    }

    function timeHTML(id, selected) {
        var html = '<select style="float:right" id="' + id + '">';
        for (var i = 0; i < 24; i++) {
            if (i == selected)
                html += '<option selected value="' + i + '">' + getTime(i) + '</option>';
            else
                html += '<option value="' + i + '">' + getTime(i) + '</option>';
        }

        html += '</select>';
        return html;
    }

    function dateHTML (date, id) {
        if (typeof(date) != "object") {
            console.log("dateHTML error: date is not an object, id: " + id +
                        "  date: " + date + "  - Reset to Jan1");
            date = new Date(2011, 1, 1);
        }

        return months[date.getMonth()] + " " + date.getDate();
    }

    function editDateHTML(id, date) {
        var select = '<select style="float:right" id="' + id + '-m">';
        for (i = 0; i < 12; i++) {
            select += '<option ';
            if (date.getMonth() == i)
                select += 'selected ';
            select += 'value="' + i + '">' + months[i] + '</option>';
        }
        select += '</select>';

        var html = '<input id="' + id + '-d" style="float:right" type="text" maxlength="2" size="2" value="' +
            date.getDate() + '" />' + select;

        return html;
    }

    // Namespace exported properties
    // TODO: Add any additional functions that you need to access
    // from your index.html page.
    ns.extend({
        'onReady': onReady,
        'onUserChange': onUserChange,
        'setDoc': setDoc,
        'getDoc': getDoc,
        'saveNewSession': saveNewSession,
        'getDocid': getDocid,
        'setDocid': setDocid,
        'signIn': signIn,
        'signOut': signOut,
        'onUserChange': onUserChange,
        'cancelSession': cancelSession,
        'wholeDoc': wholeDoc,
        'saveData': saveData,
        'setData': setData,
        'deleteData': deleteData
    });

}); // org.startpad.officehours