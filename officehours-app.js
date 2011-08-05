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

{
    events: {
        // Do all apps just inherit a users table with this default behavior?
        onUserChange: "if (!currentUser()) { self = undefined; return; }" +
            "self = lookup('users', 'this.id == currentUser()');" +
            "if (!self) {" +
            "  self = create('users', {id: currentUser()});" +
            "  edit('users', 'this.id == currentUser()');" +
            "}"
    },
    pages: {
        home: { title: "Office Hours",
                toolbar: {
                    signIn: { label: "Sign In",
                              condition: "app.currentUser() == undefined",
                              onclick: "app.signIn()"}
                }
        }
    },
    schema: {
        sessions: {
            commands: {
                del: { condition: "owner == self", label: "Delete this Office Hour" },
                create: { label: "Host an Office Hour" }
            },
            views: {
                read: { ordering: [ 'title', 'description', 'owner', 'date',
                                    'hour', 'reservation', { command: 'del' } ]},
                write: {ordering: [ 'title', 'description', 'date', 'hour' ]},
                list: { ordering: [ 'title', 'owner', 'date', 'hour' ],
                        format: "{title}\n{owner} - {date} " }
            },

            properties: {
                // "Special" properties
                title: { },
                owner: { label: "Provider" },
                description: { format: {preferedLength: 'long-text', defaultLine: 2}, },
                date: { type: 'date' },
                time: { type: 'time' },
                reservations: { type: 'reservations', card: 4, owned: true},
                short: { type: 'formatted', format: "{title}\n{owner} - {date} {hourRange}" },
                hourRange: {type: 'formatted', format: "{time | time} - {time + 2/24 | time}" }
            }
        },

        users: {
            views: {
                read: { title: "{this.title}", ordering: [ 'username', 'email', 'phone' ] },
                write: { ordering: [ 'title', 'email', 'phone' ] }
            },
            properties: {
                title: { label: 'Full Name' },
                email: { label: 'E-Mail' },
                phone: { label: 'Phone Number' }
            }
        },

        reservations: {
            commands: {
                cancel: { condition: "status == 'reserved' && owner == self",
                          action: "status = 'canceled';"},
                unCancel: { condition: "status == 'canceled' && owner == self",
                            action: "status = 'available';" },
                reserve: { condition: "status == 'available' && owner != self",
                           action: "status = 'reserved'; reserver = self" },
                unReserve: { condition: "status == 'reserved' && reserver == self",
                             action: "status = 'available'; reserver = undefined;"}
            },
            views: {
                read: { ordering: [ 'session.short', 'time', 'status', 'reserver',
                                    { command: 'cancel' },
                                    { command: 'unCancel' },
                                    { command: 'reserve' },
                                    { command: 'unReserve' }
                                  ] }
            },
            properties: {
                session: { type: 'sessions' },
                time: { type: 'time',
                        compute: "session.time + session.indexOf(this) * 0.5/24",
                        format: "{time | time} - {time + 0.5/24 | time}" },
                status: { valid: ['available', 'reserved', 'canceled'] },
                reserver: { type: 'users' }
            }
        }
    }
}