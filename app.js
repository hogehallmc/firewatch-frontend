// ------------------------------ data retrieval ------------------------------
async function grabHallList() {
  var fetchInit = {
    method: 'GET',
    cache: 'reload'
  };
  let hallList = await fetch("https://data.vtfirewatch.com/hallList.json", fetchInit)
    .then(res => res.text())
    .then(rep => { return rep; })

  return JSON.parse(hallList);
};

async function grabAlarmData() {
  var fetchInit = {
    method: 'GET',
    cache: 'reload'
  };
  let alarmData = await fetch("https://data.vtfirewatch.com/data.json", fetchInit)
    .then(res => res.text())
    .then(rep => { return rep; })

  return JSON.parse(alarmData);
};



// ------------------------------ html editing ------------------------------
function createHallElement(hallID, hallName, hallImg) {
  let hallElement = document.createElement('div');
  hallElement.id = hallID;
  hallElement.classList.add("hallElement");
  hallElement.innerHTML = '<div class="timerBackground" style="background-image: url(https://vtfirewatch.com' + hallImg + ')"><div class="imgDimmer"><div class="timerContainer imgTimer"><div class="days">0</div><div class="hours">0</div><div class="mins">0</div><div class="secs">0</div><div>days</div><div>hrs</div><div>mins</div><div>secs</div></div></div></div><h2>' + hallName + '</h2><details><summary class="summaryTag">Alarm Records</summary><ul class="alarmRecords"></ul></details>';
  document.getElementById("hallTimerContainer").appendChild(hallElement);
};

function createFeaturedHall(hallID, hallName, hallImg) {
  let hallElement = document.createElement('div');
  hallElement.id = hallID;
  hallElement.classList.add("featuredElement");
  hallElement.innerHTML = '<div class="timerBackground" style="background-image: url(https://vtfirewatch.com' + hallImg + ')"><div class="imgDimmer"><h2>' + hallName + '</h2><div class="timerContainer imgTimer"><div class="days">0</div><div class="hours">0</div><div class="mins">0</div><div class="secs">0</div><div>days</div><div>hrs</div><div>mins</div><div>secs</div></div></div></div><details><summary class="summaryTag">Alarm Records</summary><ul class="alarmRecords"></ul></details>';
  document.getElementById("featuredHallContainer").appendChild(hallElement);
}

function createAllNonFeaturedElements(hallsArray, featuredHallId) {
  for (let i = 0; i < hallsArray.length; i++) {
    if (hallsArray[i].id !== featuredHallId) {
      createHallElement(hallsArray[i].id, hallsArray[i].name, hallsArray[i].img);
    }
  }
}



// ------------------------------ data handeling ------------------------------
class hall {
  constructor(hallId, hallName, hallImg, alarmRecords) {
    this.id = hallId;
    this.name = hallName;
    this.img = hallImg;
    this.alarms = alarmRecords;
    this.mostRecent = alarmRecords[0];
  }

  currentSemesterRecords() {
    let semesterRecords = []

    for (let alarmIndex = 0; alarmIndex < this.alarms.length; alarmIndex++) {
      if (this.alarms[alarmIndex].thisSemester === true) {
        semesterRecords.push(this.alarms[alarmIndex]);
      }
    }

    return semesterRecords
  }
}

function convertToListOfHallClasses(alarmData, hallRes) {
  const hallKeys = Object.keys(alarmData.halls);
  hallsArray = []

  for (let hallIndex = 0; hallIndex < hallKeys.length; hallIndex++) {
    let currentHallId = hallKeys[hallIndex]

    let hallObj = new hall(currentHallId, hallRes[currentHallId].name, hallRes[currentHallId].img, alarmData.halls[hallKeys[hallIndex]]);
    hallsArray.push(hallObj)
  }

  return hallsArray
}

function getHallWithMostAlarms(hallsArray) {
  let mostAlarms = [0, 0]
  for (let i = 0; i < hallsArray.length; i++) {
    let numOfAlarms = hallsArray[i].currentSemesterRecords().length
    if (numOfAlarms >= mostAlarms[0]) {
      mostAlarms = [numOfAlarms, i]
    }    
  }

  return mostAlarms[1]; // return the hall id with the max alarms on record
};

async function recursiveSortAlarms(hallsArray, inOrder) {
  let oldestTime = [0, new Date()];

  for (let i = 0; i < hallsArray.length; i++) {
    
    if (hallsArray[i].mostRecent != null){

      let recentAlarmDate = new Date(hallsArray[i].mostRecent.date);

      if (recentAlarmDate < oldestTime[1]) {
        oldestTime = [i, recentAlarmDate];
      }
    }
  }

  inOrder.unshift(hallsArray.splice(oldestTime[0],1)[0])

  if (hallsArray.length > 0) {
    inOrder = recursiveSortAlarms(hallsArray, inOrder)
  }

  return inOrder
}

async function sortHallsByTimeSinceAlarm(hallsArray) {
  // make a list of halls with alarm records this semester
  let hallsWithAlarms = []
  for (let i = 0; i < hallsArray.length; i++) {
    if (hallsArray[i].alarms.length > 0) {
      hallsWithAlarms.push(hallsArray.splice(i,1)[0])
      i=-1; continue;
    }
  }

  // put our halls that have records in order
  hallsWithAlarms = await recursiveSortAlarms(hallsWithAlarms, []);

  // add our ordered list to the front of the halls without records
  hallsArray = hallsWithAlarms.concat(hallsArray);

  return hallsArray
}



// ------------------------------ timer loop ------------------------------
// this function starts the update loop responsable for keeping our timers ticking
function startTimerUpdateLoop(hallsArray) {
  let timerArray = []

  for (let hallIndex = 0; hallIndex < hallsArray.length; hallIndex++) {
    //timerArray.push([hallsArray[hallIndex].id, hallsArray[hallIndex].mostRecent]);
    
    // to show alarms no matter the semester uncomment out the above line and comment out the
    // following if statement
    if (hallsArray[hallIndex].currentSemesterRecords().length > 0) {
      timerArray.push([hallsArray[hallIndex].id, hallsArray[hallIndex].mostRecent]);
    } else {
      timerArray.push([hallsArray[hallIndex].id, false]);
    }
  }

  var refreshAlarmCounters = setInterval( function(){

    // are there any alarm entries to show? if not stop this loop
    if (timerArray.length === 0) {
      console.log("no alarms to show");
      clearInterval(refreshAlarmCounters);
    }

    let currentDate = new Date();
    // loop through all of the provided halls in our data pull
    for(let i = 0; i < timerArray.length; i++){
        
      // check and make sure the hall is actually on our page first
      let hallDiv = document.getElementById(timerArray[i][0]);

      if (hallDiv !== null) {

        if (timerArray[i][1] === false) {
          console.log("no alarms this semester for " + timerArray[i][0]);
          timerArray.splice(i,1);
          
          hallDiv.getElementsByClassName("imgTimer")[0].innerHTML = "No records this semester";
          hallDiv.getElementsByClassName("timerContainer")[0].classList.remove("timerContainer");

        } else {

        //console.log("updateing " + hallsArray[i][0])

        //now lets update our timers
        let recentAlarmDate = new Date(timerArray[i][1].date);

        let totalSecs = parseInt((currentDate - recentAlarmDate) / 1000);

        function pad ( val ) { return val > 9 ? val : "0" + val; }

        totalSecs++;

        hallDiv.getElementsByClassName("secs")[0].innerHTML = pad(totalSecs % 60);
        hallDiv.getElementsByClassName("mins")[0].innerHTML =  pad(parseInt(totalSecs / 60 % 60));
        hallDiv.getElementsByClassName("hours")[0].innerHTML = pad(parseInt(totalSecs / 3600 % 24));
        hallDiv.getElementsByClassName("days")[0].innerHTML = pad(parseInt(totalSecs / 86400));
      }
    }

  }
  }, 1000);

}




// ------------------------------- our init function -------------------------------
async function init() {
  let calendarEntries = [];

  let alarmData = await grabAlarmData();
  let hallResources = await grabHallList();
  let hallsArray = convertToListOfHallClasses(alarmData, hallResources);

  // example code (when was the last time data was pulled from the spreadsheet?)
  let lastDataPullTime = new Date(alarmData.lastUpdate);
  console.log("Last data pull was on " + lastDataPullTime.toDateString() + " at " + lastDataPullTime.toLocaleTimeString() + ".");

  // ok our data is all formated, now it's time to start our timer counter
  // (even though our timers don't exist yet)
  startTimerUpdateLoop(hallsArray);

  // ok now that we are ticking lets create our hall timers
  // first we need to calculate which hall has the most records for this semester
  let featuredHall = hallsArray[getHallWithMostAlarms(hallsArray)];
  createFeaturedHall(featuredHall.id, featuredHall.name, featuredHall.img);

  
  // lets put our halls in order of how recent they are
  hallsArray = await sortHallsByTimeSinceAlarm(hallsArray);

  // lets create all of our remaining hall elements
  createAllNonFeaturedElements(hallsArray, featuredHall.id);


  //looping through the overall list of all halls
  for(let i = 0; i < hallsArray.length; i++){

    let currentHall = hallsArray[i];
    let hallDiv = document.getElementById(currentHall.id);

    if(hallDiv !== null){ //check to make sure the actual hall HTML element exists

      let alarmsArray = currentHall.currentSemesterRecords();

      //looping thorugh the list of alarms in the current individual hall
      for(let i = 0; i < alarmsArray.length; i++){

        //initial formatting code for the alarm dates in the hall
        let dateString = new Date(alarmsArray[i].date).toLocaleString('en-US', {
          year: '2-digit', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit'
        })

        //additional formatting code for the date string in <p>, adds the dash
        const splitString = dateString.split(", ");
        dateString = splitString[0] + " - " + splitString[1];

        if (alarmsArray[i].includeComments === true) {
          dateString = dateString + " - " + alarmsArray[i].comments;
        }
        
        //connecting the textNode to the actual <p> element, then placing the <p> element in the hall HTML
        const textNode = document.createTextNode(dateString);
        
        // output our alarm list
        let newP = document.createElement("li"); //new paragraph element to be added in details
        newP.appendChild(textNode);

        var detailsTag = hallDiv.getElementsByTagName("ul")[0];
        
        detailsTag.appendChild(newP);
      
        let utcDate = new Date(alarmsArray[i].date); //ISO string
        let alarmFormatDate = new Date(alarmsArray[i].date + ' UTC');
        
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        let alarmFormatString = (new Date(utcDate.getTime() - tzoffset)).toISOString().slice(0, -1);

        let contains = false;  

        //looping through the dates on the heatmap to see if our current date is already represented as a dot.
        //substring(0,10) retrieves just the day section of the overall date. The two dates may be different, 
        //but if the days they occur on are the same, the dot is already represented
        for(let z = 0; z < calendarEntries.length; z++){
          if(calendarEntries[z].date === alarmFormatString.substring(0, 10)){

            //if our date's day is already on the heatmap, then we increase the count on the day, and push the new time.
            calendarEntries[z].total++;

            //The substring(11, 19) is the actual seconds/hours/minutes element of the date string. 3600 represents 1 'unit'(hour)
            calendarEntries[z].details.push({
              "name": currentHall.name, 
              "date": alarmFormatString.substring(0,10) + " " + alarmFormatString.substring(11, 19), 
              "value": 3600
            })

            contains = true;
            break;
            
          }
        }

        //this checks if our current date is already logged in the calendar heatmap
        if(contains == false) {

          //if contains is false, we need to add this new date into the heatmap
          calendarEntries.push({
            "date": alarmFormatString.substring(0, 10),
            "total": 1,
            "details": [{
              "name": currentHall.name,
              "date": alarmFormatString.substring(0,10) + " " + alarmFormatString.substring(11, 19),
              "value": 3600
            }]
          });
        }

      }

      //add the total alarm count in the summary tag, ex. (11)
      var summaryTag = hallDiv.getElementsByClassName("summaryTag")[0];
      summaryTag.innerHTML = summaryTag.innerHTML + " (" + currentHall.currentSemesterRecords().length + ")";

    }
  }

  var div_id = 'calendar';

  // Set custom color for the calendar heatmap
  var color = '#cd2327';

  // Set overview type (choices are year, month and day)
  var overview = 'year';

  // Handler function
  var print = function (val) {
    console.log(val);
  };

  console.log(calendarEntries);
  // Initialize calendar heatmap
  calendarHeatmap.init(calendarEntries, div_id, color, overview, print);

  
  const cal = new CalHeatmap();
  cal.paint({});
  render('<div id="cal-heatmap"></div>'); 
  
}


// -------------- lets start the show --------------
init();

