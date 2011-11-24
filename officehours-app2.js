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

**NOT TRUE**id: {type: string},

owner: The creator of an instance.
   Default definition { type: users } (the type cannot be changed).

**NOT TRUE**short: This property is used to display references to instances.
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

/*
Changes from original: "properties" -> elements, underlying structures changed as well
-Link implies special page if no schema.
-list accepts a filter term: "all" for all items of schema, 
    or a conditional statement "age >= 21"
*/

{
    pages: {
        home: { title: "Office Hours",
                toolbar: {
                    signIn: { label: "Sign In",
                              condition: "app.user == undefined",
                              onclick: "app.signIn()"},
                    signOut: { label: "Sign Out",
                              condition: "app.user != undefined",
                              onclick: "app.signOut()"},
                    myProfile: { label: "My Profile",
                                 condition: "app.user != undefined",
                                 onclick: "app.gotoInstance('users', app.user)"}
                },
                elements: [{ list:'all', schema: 'sessions' },
                             { command: 'create', schema: 'sessions' },
                             { link: 'myappointments'}]

        },
        myappointments: {
                title: "My Appointments",
                toolbar: {},
                elements: [{ list:'owner == app.user', schema: 'sessions' },
                             { list:'reserver == app.user', schema: 'reservations' },
                             ]
            
        }
    },
    schemas: {
        sessions: {
            commands: {
                del: { condition: "item.owner == app.user", label: "Delete this Office Hour" },
                create: { label: "Host an Office Hour" }
            },
            views: {
                read: { properties: [ 'description', 'owner', 'date',
                                    'hourRange', 'reservations', { command: 'del' } ]},
                edit: {properties: [ 'title', 'description', 'date', 'time' ]},
                list: { format: "{title}<br/>{owner} - {date}" }
            },

            properties: {
                // "Special" properties
                title: { },
                owner: { type: "users", label: "Provider" },
                description: { format: {preferedLength: 'long-text', defaultLine: 2}, },
                date: { type: 'date' },
                time: { label: "Start time", type: 'time' },
                endTime: { computed: "app.addTime(item.time, 2)", type: 'time' },
                reservations: { type: 'reservations', card: 4, owned: true},
                // Define supporting fields before their dependents.
                hourRange: { label: "Time range", format: "{time} - {endTime}" }
                // short: { format: "{title}\n{owner} - {date} {hourRange}" }
            }
        },

        users: {
            views: {
                read: { properties: [ 'username', 'email', 'phone' ] },
                edit: { properties: [ 'title', 'email', 'phone' ] }
            },
            properties: {
                owner: { type: "users" },
                username: { computed: "item.owner._key" },
                title: { label: 'Full Name' },
                email: { label: 'E-Mail' },
                phone: { label: 'Phone Number' }
            }
        },

        reservations: {
            commands: {
                cancel: { label: "Cancel this Session",
                          condition: "item.status == 'reserved' && item.owner._key == app.user",
                          action: "item.status = 'canceled';"},
                unCancel: { label: "Make Available",
                            condition: "item.status == 'cancelled' && item.owner._key == app.user",
                            action: "item.status = 'available';" },
                reserve: { label: "Reserve this Session",
                           condition: "item.status == 'available' && item.owner._key != app.user",
                           action: "item.status = 'reserved'; item.reserver = self" },
                unReserve: { label: "Cancel Reservation",
                             condition: "item.status == 'reserved' && item.reserver._key == app.user",
                             action: "item.status = 'available'; item.reserver = undefined;"}
            },
            views: {
                read: { properties: [ 'session', 'time', 'status', 'reserver',
                                    { command: 'cancel' },
                                    { command: 'unCancel' },
                                    { command: 'reserve' },
                                    { command: 'unReserve' }
                                    ] },
                edit: { condition: "false" }
            },
            properties: {
                title: { format: "{time} ({status})"},
                owner: { type: "users" },
                session: { type: 'sessions' },
                index: { type: 'number' },
                time: { computed: "app.addTime(item.session.time, 0, 30 * item.index)", type: 'time' },
                endTime: { computed: "app.addTime(item.session.time, 0, 30 * (item.index + 1))", type: 'time' },
                status: { valid: ['available', 'reserved', 'canceled'] },
                reserver: { type: 'users' }
            }
        }
    }
}