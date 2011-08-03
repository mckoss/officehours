namespace.lookup('com.pageforest.officehours.sample-data').defineOnce(function (ns) {
    ns.wholeDoc = {
        title: "StartPad",
        blob: {
            //address: "811 First Ave\nSuite 480\nSeattle, WA 98104",
            //phone: "(206) 388-3466",
            sessions:   {
                "cwkoss-123": {
                    id: "cwkoss-123",
                    title: "Using JQTouch for Mobile Apps",
                    description: "This is a great session where you will learn lots of stuff about JQTouch.",
                    provider: "cwkoss",
                    date: new Date(2011, 10, 1),
                    time: 11,
                    "reservation-0": "cwkoss-123-0",
                    "reservation-1": "cwkoss-123-1",
                    "reservation-2": "cwkoss-123-2",
                    "reservation-3": "cwkoss-123-3"
                },
                "bobby-124":    {
                    id: "bobby-124",
                    title: "pwning Friends at Quoridor",
                    description: "Quoridor is a game that is most fun when you make your friends most frustrated.",
                    provider: "bobby",
                    date: new Date(2011, 2, 22),
                    time: 15,
                    "reservation-0": "bobby-124-0",
                    "reservation-1": "bobby-124-1",
                    "reservation-2": "bobby-124-2",
                    "reservation-3": "bobby-124-3"
                },
                "mckoss-8977":  {
                    id: "mckoss-8977",
                    title: "Angry Birds as Stress Relief",
                    description: "Get the pigs!  They have taken our eggs! Learn about angles and when to tap the screen.",
                    provider: "mckoss",
                    date: new Date(2011, 5, 6),
                    time: 14,
                    "reservation-0": "mckoss-8977-0",
                    "reservation-1": "mckoss-8977-1",
                    "reservation-2": "mckoss-8977-2",
                    "reservation-3": "mckoss-8977-3"
                }
            },
            users:      {
                "cwkoss":{
                    username: "cwkoss",
                    fullname: "Chris Koss",
                    phone: "425-246-7703",
                    email: "chris@mckoss.com"
                },
                "bobby":{
                    username: "bobby",
                    fullname: "Bobby Seidensticker",
                    phone: "425-555-1234",
                    email: "bobby@mckoss.com"
                },
                "mckoss":{
                    username: "mckoss",
                    fullname: "Mike Koss",
                    phone: "425-246-7701",
                    email: "mike@mckoss.com"
                }
            },
            reservations: { "cwkoss-123-0": {status: "Available", time: "11 :00AM - 11:30AM", parent:"cwkoss-123", owner: "cwkoss"},
                            "cwkoss-123-1": {status: "mckoss", time: "11:30AM - 12:00PM", parent:"cwkoss-123", owner: "cwkoss"},
                            "cwkoss-123-2": {status: "bobby", time: "12:00PM - 12:30PM", parent:"cwkoss-123", owner: "cwkoss"},
                            "cwkoss-123-3": {status: "Available", time: "12:30PM - 1:00PM", parent:"cwkoss-123", owner: "cwkoss"},
                            "bobby-124-0": {status: "cwkoss", time: "3:00PM - 3:30PM", parent:"bobby-124", owner: "bobby"},
                            "bobby-124-1": {status: "mckoss", time: "3:30PM - 4:00PM", parent:"bobby-124", owner: "bobby"},
                            "bobby-124-2": {status: "Cancelled", time: "4:00PM - 4:30PM", parent:"bobby-124", owner: "bobby"},
                            "bobby-124-3": {status: "Cancelled", time: "4:30PM - 5:00PM", parent:"bobby-124", owner: "bobby"},
                            "mckoss-8977-0": {status: "Available", time: "2:00PM - 2:30PM", parent:"mckoss-8977", owner: "mckoss"},
                            "mckoss-8977-1": {status: "Available", time: "2:30PM - 3:00PM", parent:"mckoss-8977", owner: "mckoss"},
                            "mckoss-8977-2": {status: "bobby", time: "3:00PM - 3:30PM", parent:"mckoss-8977", owner: "mckoss"},
                            "mckoss-8977-3": {status: "cwkoss", time: "3:30PM - 4:00PM", parent:"mckoss-8977", owner: "mckoss"}
                          },

            instructions: {
                sessions: {
                    settings:{  owner: "provider",
                                display: [["toolbar", ["value", "title"], ["back"], ["condition", "owned", "edit"]],
                                          ["ul", {"lines":["description", "provider", "date", "time"]}],
                                          ["h2", "Schedule"],
                                          ["ul", {"lines": ["reservation-0", "reservation-1", "reservation-2", "reservation-3"]}],
                                          ["condition", "owned", ["button", "", ["delete", "sessions", "key"], "Delete this Office Hour"]]],
                                edit: [["toolbar", ["value", "title"], ["back", "Cancel"], ["save"]],
                                       ["ul", {"lines":["description", "provider", "date", "time"]}]],


                                lineDisplay: [['', '<br/>', ' - ', ' - '],
                                              ["title", "provider", "date", "time"]]},
                    attr:   [
                        {
                            fieldName: "Title",
                            dataField: "title",
                            dataType: "string",
                            display: "h1text"
                        },
                        {
                            fieldName: "Description",
                            dataField: "description",
                            dataType: "textarea",
                            display: "nolabel"
                        },
                        {
                            fieldName: "Provider",
                            dataField: "provider",
                            dataType: "users",
                            condition: " != client.username",
                            editable: false
                        },
                        {
                            fieldName: "Date",
                            dataField: "date",
                            dataType: "date"
                        },
                        {
                            fieldName: "Time",
                            dataField: "time",
                            dataType: "time"
                        },
                        {
                            fieldName: "Rez 0",
                            dataField: "reservation-0",
                            dataType: "reservations",
                            display: "nolabel"
                        },
                        {
                            fieldName: "Rez 1",
                            dataField: "reservation-1",
                            dataType: "reservations",
                            display: "nolabel"
                        },
                        {
                            fieldName: "Rez 2",
                            dataField: "reservation-2",
                            dataType: "reservations",
                            display: "nolabel"
                        },
                        {
                            fieldName: "Rez 3",
                            dataField: "reservation-3",
                            dataType: "reservations",
                            display: "nolabel"
                        }]
                },

                users: {
                    settings:{lineDisplay: [['<div style="float:right">', '</div>'], ["fullname"]],
                              display: [["toolbar", "Profile", ["back"], ["condition", "owned", "edit"]],
                                        ["ul", {"lines": ["fullname", "phone", "email"]}],
                                        ["condition", "owned", ["link", "myappt", "My Appointments"]]],
                              edit:  [["toolbar", "Profile", ["back"], ["save"]],
                                      ["ul", {"lines": ["fullname", "phone", "email"]}]],
                              owner: "username",
                              lineEdit: []},
                    attr:[{
                        fieldName: "Name",
                        dataField: "fullname",
                        dataType: "string"
                    },
                          {
                              fieldName: "Phone",
                              dataField: "phone",
                              dataType: "string"
                          },
                          {
                              fieldName: "Email",
                              dataField: "email",
                              dataType: "string"
                          },
                          {
                              fieldName: "Username",
                              dataField: "username",
                              dataType: "users",
                              display: "nodisplay"
                          }
                         ]
                },
                reservations: {
                    settings:{lineDisplay: [['<div style="float:left">', '</div>','<div style="float:right">', '</div>'], ["time", "", "status"]],
                              display: [["toolbar", "Reservation", ["back"]],
                                        ["ul", {"lines": ["parent", "time", "status"]}],
                                        ["condition", "rezreserver", ["button", "", ["set", "status", "client.username", ""], "Reserve This Session"]],
                                        ["condition", "rezholder", ["button", "", ["set", "status", "\"Available\"", ""], "Cancel This Session"]],
                                        ["condition", "rezcancancel", ["button", "", ["set", "status", "\"Cancelled\"", ""], "Cancel This Session"]],
                                        ["condition", "rezcanuncancel", ["button", "", ["set", "status", "\"Available\"", ""], "Make Available"]]],
                              owner: "owner",
                              lineEdit: []},
                    attr:[{
                        fieldName: "Session",
                        dataField: "parent",
                        dataType: "sessions",
                        display: "nolabel",
                        linked: "nolink"
                    },
                          {
                              fieldName: "Time",
                              dataField: "time",
                              dataType: "string"
                          },
                          {
                              fieldName: "Status",
                              dataField: "status",
                              dataType: "string"
                          },
                          {
                              fieldName: "owner",
                              dataField: "owner",
                              dataType: "users",
                              display: "nodisplay"
                          }
                         ]
                },
                home: {
                    settings:{type:"pageSpec",
                              display: [["toolbar", "Startpad", ["condition", "notsignedin", ["button", "", "signIn()", "Sign In"]], ["condition", "signedin", ["button", "client.username", "", "My Profile"]]],
                                        ["h2", "Office Hours"],
                                        ["ul" , {"lines": ["sessions", "all"]}],
                                        ["condition", "signedin", ["button", "newSession", "", "Host an Office Hour"]]]
                             }
                },
                condition: {
                    signedin: "client.username != undefined",
                    owned: "isOwned(arg[0],arg[1])",
                    rezholder: "wholeDoc.blob.reservations[arg[1]].status == client.username",
                    rezavailable: "wholeDoc.blob.reservations[arg[1]].status == 'Available'",
                    rezcancelled: "wholeDoc.blob.reservations[arg[1]].status == 'Cancelled'",
                    rezcanceller: "(wholeDoc.blob.reservations[arg[1]].status == client.username) || isOwned(arg[0],arg[1])",
                    rezreserver: "(wholeDoc.blob.reservations[arg[1]].status == \"Available\") && (!isOwned(arg[0],arg[1]))",
                    rezcancancel: "(wholeDoc.blob.reservations[arg[1]].status != 'Cancelled') && isOwned(arg[0],arg[1])",
                    rezcanuncancel: "(wholeDoc.blob.reservations[arg[1]].status == 'Cancelled') && isOwned(arg[0],arg[1])"
                }

            }}


    };

});
