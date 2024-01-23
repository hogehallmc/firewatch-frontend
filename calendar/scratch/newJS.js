async function grabAlarmData() {
  let fetchHeaders = new Headers();
  fetchHeaders.append('pragma', 'no-cache');
  fetchHeaders.append('cache-control', 'no-cache');
  var fetchInit = {
    method: 'GET',
    headers: fetchHeaders,
  };
  let alarmData = await fetch("https://pritchardalarms.com/alarmdata/data.json", fetchInit)
    .then(res => res.text())
    .then(rep => { return rep; })

  return JSON.parse(alarmData);
};

async function init() {
  let calendarEntries = [];

  let alarmData = await grabAlarmData();

  // example code (when was the last time data was pulled from the spreadsheet?)
  let lastDataPullTime = new Date(alarmData.lastUpdate);
  console.log("Last data pull was on " + lastDataPullTime.toDateString() + " at " + lastDataPullTime.toLocaleTimeString() + ".");
  console.log(alarmData);

  let hallsArray = Object.entries(alarmData.halls);
  console.log(hallsArray)

  setInterval( function(){

    let currentDate = new Date();

    for(let i = 0; i < hallsArray.length; i++){

      let hallDiv = document.getElementById(hallsArray[i][0]);

      // check and make sure the hall is actually on our page first
      if (hallDiv !== null) {
        //now lets update our timers

        //most recent alarm from the current hall
        let recentAlarmDate = new Date(hallsArray[i][1][0].date);

        let totalSecs = parseInt((currentDate - recentAlarmDate) / 1000);

        function pad ( val ) { return val > 9 ? val : "0" + val; }

        totalSecs++;

        hallDiv.getElementsByClassName("secs")[0].innerHTML = pad(totalSecs % 60);
        hallDiv.getElementsByClassName("mins")[0].innerHTML =  pad(parseInt(totalSecs / 60 % 60));
        hallDiv.getElementsByClassName("hours")[0].innerHTML = pad(parseInt(totalSecs / 3600 % 24));
        hallDiv.getElementsByClassName("days")[0].innerHTML = pad(parseInt(totalSecs / 86400));
      }

    }
  }, 1000);

  //looping through the overall list of all halls
  for(let i = 0; i < hallsArray.length; i++){

    let currentHall = hallsArray[i];
    let hallDiv = document.getElementById(currentHall[0]);

    if(hallDiv !== null){ //check to make sure the actual hall HTML element exists

      let alarmsArray = currentHall[1];

      //looping thorugh the list of alarms in the current individual hall
      for(let i = 0; i < alarmsArray.length; i++){

        const newP = document.createElement("p"); //new paragraph element to be added in details

        //initial formatting code for the alarm dates in the hall
        let dateString = new Date(alarmsArray[i].date).toLocaleString('en-US', {
          timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit'
        })

        //additional formatting code for the date string in <p>, adds the dash
        const splitString = dateString.split(", ");
        dateString = splitString[0] + " - " + splitString[1];
        
        //connecting the textNode to the actual <p> element, then placing the <p> element in the hall HTML
        const textNode = document.createTextNode(dateString);
        newP.appendChild(textNode);
        
        var detailsTag = hallDiv.getElementsByTagName("details")[0];
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
              "name": currentHall[0], 
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
                "name": currentHall[0],
                "date": alarmFormatString.substring(0,10) + " " + alarmFormatString.substring(11, 19),
                "value": 3600
              }]
            });

          }
      }
    
      //add the total alarm count in the summary tag, ex. (11)
      let summaryTag = detailsTag.getElementsByTagName("summary")[0];
      summaryTag.innerHTML = summaryTag.innerHTML + " (" + currentHall[1].length + ")";
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

  // Initialize calendar heatmap
  calendarHeatmap.init(calendarEntries, div_id, color, overview, print);
  
}

init();