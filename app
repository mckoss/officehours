<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />

    <title>App Generator&beta;</title>

    <script type="text/javascript"
            src="http://ajax.googleapis.com/ajax/libs/jquery/1.4/jquery.min.js"></script>
    <script type="text/javascript" src="/lib/beta/js/utils.js"></script>
    <script src="/js/jqtouch/jqtouch/jqtouch.js" type="application/x-javascript" charset="utf-8"></script>
    <script type="text/javascript" src="/appgen-all.js"></script>
    <style type="text/css" media="screen">@import "/js/jqtouch/jqtouch/jqtouch.css";</style>
    <style type="text/css" media="screen">@import "/js/jqtouch/themes/apple/theme.css";</style>
    <script type="text/javascript">
      $(document).ready(namespace.com.pageforest.appgen.main);
    </script>

    <style type="text/css" media="screen">
      /* Custom Style */
    </style>
  </head>
  <body>
    <div id="jqt">
      <div id="home" class="current">
        <div class="toolbar">
          <h1 id="location-name">Location</h1>
          <div id="homeSignIn"></div>

        </div>
        <a onclick="gotoLink('#myProfile');"><h2>LINK</h2></a>
        <h2>Office Hours</h2>
        <ul id="homesessions" class="rounded">
        </ul>
        <a href="#newSession" class="whiteButton pop">New Office Hour</a>

        <ul class="rounded">
          <li class="arrow"><a href="#myappt">My Appointments</a></li>

        </ul>


      </div>

      <div id="myProfile">
        <div class="toolbar">
          <h1>My Profile</h1>

          <a href="#home" class="button slideleft" onclick="officehours.saveProfile();" >Save</a>
          <a href="#home" class="button slideright" onclick="officehours.signOut();" >Sign Out</a>
        </div>

        <ul id="myInfo" class="rounded">>

        </ul>

        <ul class="rounded">
          <li class="arrow"><a href="#myappt">My Appointments</a></li>
        </ul>

      </div>

      <form id="newSession">
        <div class="toolbar">
          <h1>New Session</h1>
          <a href="#" class="back">Cancel</a>
          <a href="#" class="button slideright" onclick="officehours.saveNewSession();" id="newSessionSave" >Save</a>
        </div>
        <ul class="rounded">
          <li>
            <label for="seshTitle">Title</label>
            <input type="text" name="title" placeholder="New Title" id="seshTitle" />
          </li>
          <li class="noflex">
            <label for="seshDesc">Description</label>
            <textarea name="description" placeholder="New Description" id="seshDesc"></textarea>
          </li>
          <li>
            <label for="seshDate">Date</label>
            <input id="seshDate-d" style="float:right" type="text" maxlength="2" size="2" value="1" /><select style="float:right" id="seshDate-m"><option value="0">Jan</option><option value="1">Feb</option><option value="2">Mar</option><option value="3">Apr</option><option value="4">May</option><option value="5">Jun</option><option value="6">Jul</option><option value="7">Aug</option><option value="8">Sep</option><option value="9">Oct</option><option selected value="10">Nov</option><option value="11">Dec</option></select>
          </li>
          <li>
            <label for="seshTime">Time</label>
            <select style="float:right" id="seshTime"><option value="0">12 :00AM - 2:00AM</option><option value="1">1 :00AM - 3:00AM</option><option value="2">2 :00AM - 4:00AM</option><option value="3">3 :00AM - 5:00AM</option><option value="4">4 :00AM - 6:00AM</option><option value="5">5 :00AM - 7:00AM</option><option value="6">6 :00AM - 8:00AM</option><option value="7">7 :00AM - 9:00AM</option><option value="8">8 :00AM - 10:00AM</option><option value="9">9 :00AM - 11:00AM</option><option value="10">10 :00AM - 12:00PM</option><option selected value="11">11 :00AM - 1:00PM</option><option value="12">12 :00PM - 2:00PM</option><option value="13">1 :00PM - 3:00PM</option><option value="14">2 :00PM - 4:00PM</option><option value="15">3 :00PM - 5:00PM</option><option value="16">4 :00PM - 6:00PM</option><option value="17">5 :00PM - 7:00PM</option><option value="18">6 :00PM - 8:00PM</option><option value="19">7 :00PM - 9:00PM</option><option value="20">8 :00PM - 10:00PM</option><option value="21">9 :00PM - 11:00PM</option><option value="22">10 :00PM - 12:00AM</option><option value="23">11 :00PM - 1:00AM</option></select>
          </li>
        </ul>

      </form>


      <div id="myappt">
        <div class="toolbar">
          <h1>My Appointments</h1>
          <a href="#" class="back">Back</a>
        </div>
        <ul class="rounded" id="myAppts">
        </ul>
        <a href="#newSession" class="whiteButton">New Office Hour</a>
      </div>


      <div id="reservation">
        <div class="toolbar">
          <h1>Reservation</h1>
          <a href="#" class="back">Back</a>
        </div>

        <ul class="rounded">
          <li>Using JQTouch</li>
          <li>Mentor: Chris Koss</li>
          <li>Student: Mike Koss</li>
          <li>Location: Startpad</li>
          <li>Date: 1/10/11</li>
          <li>Time: 3-3:30pm</li>
        </ul>
        <a href="#" class="whiteButton">Reserve</a>
        <br/>
        <a href="#" class="whiteButton">Cancel</a>
      </div>

      <div id="signUp">
        <div class="toolbar">
          <h1>Sign Up</h1>
          <a href="#" class="back">Back</a>
        </div>

        <ul class="rounded">
          <li>Username</li>
          <li>Password</li>
          <li>(this is a placeholder)</li>
        </ul>
        <a href="#" class="whiteButton">Join</a>
        <br/>
        <a href="#" class="whiteButton">Cancel</a>
      </div>

    </div>
  </body>
</html>
