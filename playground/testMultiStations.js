// C:\Users\Admin\Google-Drive\dev\lab\Alexa\next-train\playground

var request = require('request-promise');
var schedDetails = ''
var predictedDetails = ''
var inboundTrains = ''
var outboundTrains = ''

var BASE= 'http://realtime.mbta.com/developer/api/v2/'
var GET_SCHEDULE = 'schedulebystop' // predictionsbystop, alertsbystop
var GET_PREDICTION = 'predictionsbystop'
var KEY = '?api_key=wX9NwuHnZU2ToO7GmGR9uw' // Developer's key change for production
var FORMAT = '&format=json'
var MAX_TIME = '&max_time=300'
var APIList = []
var stationList = ['Framingham', 'Southborough']
let promises = []

APIList = buildAPIList(stationList)
for(i=0;i<APIList.length;i++){
  promises.push(GetStopDetails(
    APIList[i]))
}
Promise.all(promises)
  .then((results) => {
    inboundTrains = []
    outboundTrains = []
//    console.log("Number of promises:"+promises.length);
    for (j=0;j<results.length;j+=2){
      console.log(results[j]);
      console.log(results[j+1]);
      jDataSchedule = JSON.parse(results[j])
      jDataPredict = JSON.parse(results[j+1])
//      console.log(jDataSchedule.stop_name,j);
      inboundTrains.push.apply(inboundTrains,getTrains(1,jDataSchedule, jDataPredict));
      outboundTrains.push.apply(outboundTrains,getTrains(0,jDataSchedule, jDataPredict));
    }

    // DEBUGGING
    for (i=0;i<inboundTrains.length; i++) {
      console.log("INBOUND:"+inboundTrains[i]);
    }
    for (i=0;i<outboundTrains.length;i++){
      console.log("OUTBOUND:"+outboundTrains[i]);
    }
  })
  .catch((error) =>{
    console.log('One of the PROMISES failed', error);
//    this.emit(':tell' `Sorry, there was a problem reaching the MBTA please try again later.`);
  })

  // Get the next two inbound and outbound trains with the prediction time for the first train in requested direction
  // Return an array of 'spoken' strings as the result

    function getTrains(inOut, scheduled, predicted){
      var trains = []
      var spoken = '';
      if (scheduled.mode[0].route[0].direction[inOut].trip[i] === undefined){
        tripID = ''
      } else {
        tripID = scheduled.mode[0].route[0].direction[inOut].trip[i].trip_id
      }

      for (i=0;i<2;i++){
        predictionStr = getPrediction(i, tripID,inOut,predicted)
        spoken = getScheduled(i,tripID,inOut,scheduled)+predictionStr
        trains[i] = spoken
        spoken = ""
        predictionStr = ""
      }
      return trains
    }



// Return times in spoken English format. Returns a 'spoke' string
function humanize(results) {
  var response = results[0].toString()+" "+results[1].toString()
  //Humanize the numbers
  if (results[1] < 10){
    results[2] = 0
    if (results[1] == 0){
      response = results[0].toString()+" O Clock"
    } else {
        if( results[1] == 1)
        {
          response = results[1].toString()+" minute past "+results[0].toString()
        } else {
          response = results[1].toString()+" minutes past "+results[0].toString()
        }
    }
  }
  if (results[2]) {
    response = response+" pm"
  }
  return response
}

// Turn epoch time in to human time. Use a flag for PM
function realTime(epoch){
  var pm = false ;
  var d = new Date(0) ;
  d.setUTCSeconds(epoch)
  var h = d.getHours()
  var m = d.getMinutes()
  if (h>12) {
    pm = true
    h = h -12
  }
  return [h,m,pm]
}

// Make the trip name sound good
function trimTrip(text){
  var i = text.indexOf("\(")
  var i2 = text.indexOf("\)")
  return text.substring(i+1,i2);
}

// Get the next scheduled train
function getScheduled(i,tripID,inOut,scheduled) {
  var base0 = "The next "
  var base1 = " train the "
  var base2 = " is scheduled to arrive at "
  var base3 = " stopping at "
  var trainDirection = scheduled.mode[0].route[0].direction[inOut].direction_name
  if (i > 0){
    base0 = "The following "
  }
  station = scheduled.stop_name
  line = scheduled.mode[0].route[0].route_name
  tripID = scheduled.mode[0].route[0].direction[inOut].trip[i].trip_id
  tripName = scheduled.mode[0].route[0].direction[inOut].trip[i].trip_name
  tripName = trimTrip(tripName)
  schedArrival = scheduled.mode[0].route[0].direction[inOut].trip[i].sch_arr_dt
  results = realTime(schedArrival)
  arrivalString = humanize(results)
  return base0+trainDirection+base1+tripName+base3+station+base2+arrivalString

}

// Get the prediction for the requested train
function getPrediction(prediction, tripIndex,inOut,pred) {
  if (prediction >0) { // Only get the prediction for the first train
    return ''
  }
  base0 =". The MBTA estimate the actual arrival is "
  base1 =". the train is currently "
  base2 = " minutes away. "
  results2 = []
  parrivalString = ''
  try {
    predTime = pred.mode[0].route[0].direction[inOut].trip[0].pre_dt
    awayTime = pred.mode[0].route[0].direction[inOut].trip[0].pre_away
  }
  catch(err){
    return ''
  }
  results2 = realTime(predTime)
  parrivalString = humanize(results2)
  awayString = Math.floor(awayTime/60).toString()  // Simple calculation to turn away seconds to minutes
  return base0+parrivalString+base1+awayString+base2
}


function buildAPIList(stations) {
  var APIs = []
  if (stations.length == 0){
    return []
  }
  for(i = 0; i<stations.length; i++){
    // Build Schedule API
    URL = BASE+GET_SCHEDULE+KEY+"&stop="+stations[i]+FORMAT+MAX_TIME
    APIs.push(URL)
    URL = BASE+GET_PREDICTION+KEY+"&stop="+stations[i]+FORMAT
    APIs.push(URL)
  }
  return APIs
}


// Reachout to the MBTA and get the train Details

function GetStopDetails(api_request)  {
  return new Promise((resolve, reject) => {
    request({
      url: api_request,
      method: 'GET',
      headers: {
          'Content-Type': 'application/json'
      }
    })
    .then((response) => {
      // Return User Details
      resolve(response);
    })
    .catch((error) => {
      // API Error
      reject('API Error: ', error);
    });
  });
}
