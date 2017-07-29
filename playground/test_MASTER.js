// C:\Users\Admin\Google-Drive\dev\lab\Alexa\next-train\playground

var request = require('request-promise');
var schedDetails = ''
var predictedDetails = ''
var inboundTrains = ''
var outboundTrains = ''

var BASE= 'http://realtime.mbta.com/developer/api/v2/'
var ACTION = 'schedulebystop' // predictionsbystop, alertsbystop
var KEY = '?api_key=wX9NwuHnZU2ToO7GmGR9uw' // Developer's key change for production
var TRAIN_STOP = '&stop=Southborough'
var FORMAT = '&format=json'
var MAX_TIME = ''
//Main call = http://realtime.mbta.com/developer/api/v2/predictionsbystop?api_key=wX9NwuHnZU2ToO7GmGR9uw&stop=Southborough&format=json
var URL = 'http://realtime.mbta.com/developer/api/v2/schedulebystop?api_key=wX9NwuHnZU2ToO7GmGR9uw&stop=Southborough&format=json&max_time=300'

// Get the schedulebystop details in both directions
GetStopDetails(URL)
  .then((data) => {
    schedDetails = data
    // Now get the predicted data for the first train in each direction
    ACTION = 'predictionsbystop'
    URL=BASE+ACTION+KEY+TRAIN_STOP+FORMAT+MAX_TIME
    GetStopDetails(URL)
    .then((data) => {
      predictedDetails = data
      inboundTrains = getTrains(1,schedDetails, predictedDetails);
      outboundTrains = getTrains(0,schedDetails, predictedDetails);
      // Loop over inboundTrains
      for (i=0;i<inboundTrains.length; i++) {
        console.log("INBOUND:"+inboundTrains[i]);
      }
      for (i=0;i<outboundTrains.length;i++){
        console.log("OUTBOUND:"+outboundTrains[i]);
      }
    })
    .catch((error) =>{
      console.log('Second API error', error);
//      this.emit(':tell' `Sorry, there was a problem reaching the MBTA please try again later.`);
    })
  })
  .catch((error) => {
    console.log('First API call ERROR', error);
//  this.emit(':tell' `Sorry, there was a problem reaching the MBTA please try again later.`);
  });

function getPrediction(prediction, tripIndex,inOut,predicted) {
  if (prediction >0) { // Only get the prediction for the first train
    return ''
  }
  base0 =". The MBTA estimate the actual arrival is "
  base1 =". the train is currently "
  base2 = " minutes away. "
  results2 = []
  parrivalString = ''
  pred = JSON.parse(predicted)
  if (pred.mode[0].route[0].direction[inOut] === undefined ) {
    return '' //Make sure the prediction exists
  }
  if (tripIndex != pred.mode[0].route[0].direction[inOut].trip[0].trip_id ) {
    return '' //Make sure the prediction is for the right train
  }
  // Get the predicted arrival Time and how far away it is
  predTime = pred.mode[0].route[0].direction[inOut].trip[0].pre_dt
  awayTime = pred.mode[0].route[0].direction[inOut].trip[0].pre_away
  results2 = realTime(predTime)
  parrivalString = results2[0].toString()+" "+results2[1].toString()
  // Humanize the numbers
  if (results[1] < 10){
    if (results[1] == 0){
      parrivalString = results[0].toString()+" O Clock"
    } else {
        if(results[1]==1){
          parrivalString = results[1].toString()+" minute past "+results[0].toString()

        } else {
          parrivalString = results[1].toString()+" minutes past "+results[0].toString()
        }
    }
  }
  awayString = Math.floor(awayTime/60).toString()  // Simple calculation to turn away seconds to minutes
  return base0+parrivalString+base1+awayString+base2
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

// Get the next two inbound and outbound trains with the prediction time for the first train in each direction
function getTrains(inOut, scheduled, predicted){
  var trains = []
  var base0 = "The next "
  var base1 = " train the "
  var base2 = " is scheduled to arrive at "
  var spoken = '';
  var sched = JSON.parse(scheduled);
  var trainDirection = sched.mode[0].route[0].direction[inOut].direction_name
  for (i=0;i<2;i++){
    line = sched.mode[0].route[0].route_name
    tripID = sched.mode[0].route[0].direction[inOut].trip[i].trip_id
    tripName = sched.mode[0].route[0].direction[inOut].trip[i].trip_name
    tripName = trimTrip(tripName)
    schedArrival = sched.mode[0].route[0].direction[inOut].trip[i].sch_arr_dt
    results = realTime(schedArrival)
    arrivalString = results[0].toString()+" "+results[1].toString()
    //Humanize the numbers
    if (results[1] < 10){
      if (results[1] == 0){
        arrivalString = results[0].toString()+" O Clock"
      } else {
          if( results[1] == 1)
          {
            arrivalString = results[1].toString()+" minute past "+results[0].toString()
          } else {
            arrivalString = results[1].toString()+" minutes past "+results[0].toString()
          }
      }
    }
    if (results[2]) {
      arrivalString = arrivalString+" pm"
    }
    predictionStr = getPrediction(i, tripID,inOut,predicted)
    spoken = base0+trainDirection+base1+tripName+base2+arrivalString+predictionStr
    trains[i] = spoken
    base0 = "The following "
    spoken = ""
    arrivalString = ""
    predictionStr = ""
  }
  return trains
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
