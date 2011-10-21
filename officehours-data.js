{
    sessions:   {
                "cwkoss-123": {
                    title: "Using JQTouch for Mobile Apps",
                    description: "This is a great session where you will learn lots of stuff about JQTouch.",
                    owner: "cwkoss",
                    date: "2011-10-01",
                    time: '13:00',
                    reservations: ["cwkoss-123-0", "cwkoss-123-1", "cwkoss-123-2", "cwkoss-123-3"]
                },
                "bobby-124":    {
                    title: "pwning Friends at Quoridor",
                    description: "Quoridor is a game that is most fun when you make your friends most frustrated.",
                    owner: "bobby",
                    date: "2011-02-22",
                    time: '15:00',
                    reservations: ["bobby-124-0", "bobby-124-1", "bobby-124-2", "bobby-124-3"]
                },
                "mckoss-8977":  {
                    title: "Angry Birds as Stress Relief",
                    description: "Get the pigs!  They have taken our eggs! Learn about angles and when to tap the screen.",
                    owner: "mckoss",
                    date: "2011-05-06",
                    time: '14:00',
                    reservations: ["mckoss-8977-0", "mckoss-8977-1", "mckoss-8977-2", "mckoss-8977-3"]
                }
            },
            users:      {
                "cwkoss":{
                    owner: "cwkoss",
                    title: "Chris Koss",
                    phone: "425-246-7703",
                    email: "chris@mckoss.com"
                },
                "bobby":{
                    owner: "bobby",
                    title: "Bobby Seidensticker",
                    phone: "425-555-1234",
                    email: "bobby@mckoss.com"
                },
                "mckoss":{
                    owner: "mckoss",
                    title: "Mike Koss",
                    phone: "425-246-7701",
                    email: "mike@mckoss.com"
                }
            },
            reservations: { "cwkoss-123-0": {index: 0, reserver: undefined, status: "available", session:"cwkoss-123", owner: "cwkoss"},
                            "cwkoss-123-1": {index: 1, reserver: "mckoss", status: "reserved", session:"cwkoss-123", owner: "cwkoss"},
                            "cwkoss-123-2": {index: 2, reserver: "bobby", status: "reserved", session:"cwkoss-123", owner: "cwkoss"},
                            "cwkoss-123-3": {index: 3, reserver: undefined, status: "available", session:"cwkoss-123", owner: "cwkoss"},
                            "bobby-124-0": {index: 0, reserver: "cwkoss", status: "reserved", session:"bobby-124", owner: "bobby"},
                            "bobby-124-1": {index: 1, reserver: "mckoss", status: "reserved", session:"bobby-124", owner: "bobby"},
                            "bobby-124-2": {index: 2, reserver: undefined, status: "cancelled", session:"bobby-124", owner: "bobby"},
                            "bobby-124-3": {index: 3, reserver: undefined, status: "cancelled", session:"bobby-124", owner: "bobby"},
                            "mckoss-8977-0": {index: 0, reserver: undefined, status: "available", session:"mckoss-8977", owner: "mckoss"},
                            "mckoss-8977-1": {index: 1, reserver: undefined, status: "cancelled", session:"mckoss-8977", owner: "mckoss"},
                            "mckoss-8977-2": {index: 2, reserver: "bobby", status: "reserved", session:"mckoss-8977", owner: "mckoss"},
                            "mckoss-8977-3": {index: 3, reserver: "cwkoss", status: "reserved", session:"mckoss-8977", owner: "mckoss"}
                          }
}
