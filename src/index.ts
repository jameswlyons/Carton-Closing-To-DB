//Service for Dematic Dashboard Screwfix - Setpoints to DB
//Created by: JWL
//Date: 2023/02/02 02:51:41
//Last modified: 2023/09/03 14:31:55
//Version: 1.0.8

//import process tracker and start the process
import ProcessTracker from "./processTracker.js";
ProcessTracker.startProcess("setPointsToDb");

//import dematic master library
//@ts-ignore
import dematic from "dematic-master-lib";

//imports
import cron from "node-cron";
import moment from "moment";

//import plc
import plc from "./plc/plc.js";
import snap7Types from "./plc/types.js";

//import db
import mysql from "./db/mysqlConnection.js";

//startup text
dematic.log("Dematic Dashboard Micro Service - Setpoints to DB V 1.0.1");
dematic.log("Using Dematic Master Library Version: " + dematic.version);

cron.schedule("*/1 * * * *", function () {
  getSetPoints();
});

var data: any = {};
let requests: any[] = [];
let offSetPoint = [];

var timeNow = new Date();

getSetPoints();

async function getSetPoints() {
  console.log(" ");

  timeNow = new Date();
  // convert date to a string in UTC timezone format:
  console.log(timeNow.toUTCString());
  console.log("Stating Center Line's");

  console.log("Getting requests from sql");

  var query = "SELECT * FROM setPoints.request";

  requests = await mysql.query(query);

  console.log("Got requests from sql");
  console.log("Fetching Values");

  await centerLine("10.4.2.150", "Line1iPack", "iPack", 1);
  await centerLine("10.4.2.152", "Line2iPack", "iPack", 2);
  await centerLine("10.4.2.154", "Line3iPack", "iPack", 3);
  await centerLine("10.4.2.156", "Line4iPack", "iPack", 4);

  await centerLine("10.4.2.151", "Line1Lidder", "Lidder", 1);
  await centerLine("10.4.2.153", "Line2Lidder", "Lidder", 2);
  await centerLine("10.4.2.155", "Line3Lidder", "Lidder", 3);
  await centerLine("10.4.2.157", "Line4Lidder", "Lidder", 4);

  await centerLine("10.4.2.160", "Line1Erector", "Erector", 1);
  await centerLine("10.4.2.161", "Line2Erector", "Erector", 2);
  await centerLine("10.4.2.162", "Line3Erector", "Erector", 3);
  await centerLine("10.4.2.163", "Line4Erector", "Erector", 4);

  await centerLine("10.4.2.164", "Line5Erector", "Erector", 5);

  console.log("Finished Center Line's");
}

async function centerLine(ip: string, localLogArray: string, type: string, line: number) {
  //console.log("\n\nMachines of setPoint " + localLogArray);

  if (data[localLogArray] == undefined) {
    data[localLogArray] = [];
  }
  if (data[localLogArray]["centerLines"] == undefined) {
    data[localLogArray]["centerLines"] = [];
  }

  for (const index in requests) {
    const element = requests[index];

    if (element.machine != localLogArray) continue;

    const array = {
      ip: ip,
      machine: element.machine,
      db: element.db,
      doubleInt: element.dbw,
      name: element.name,
      doubleWord: element.doubleWord,
    };
    // console.log(array);
    let promise1 = null;

    try {
      if (element.doubleWord == "t") {
        promise1 = await plc.readFromS7DBToInt(array.ip, 0, 2, array.db, array.doubleInt, snap7Types.WordLen.S7WLDWord);
      } else if (element.doubleWord == "5") {
        promise1 = await plc.readFromS7DBToInt(array.ip, 0, 2, array.db, array.doubleInt, snap7Types.WordLen.S7WLTimer);
      } else if (element.doubleWord == "m") {
        promise1 = await plc.readFromS7MarkerToInt(array.ip, 0, 2, array.doubleInt, snap7Types.WordLen.S7WLCounter);
      } else if (element.doubleWord == "b") {
        promise1 = await plc.readFromS7DBToBit(array.ip, 0, 2, array.db, array.doubleInt);
      } else {
        promise1 = await plc.readFromS7DBToInt(array.ip, 0, 2, array.db, array.doubleInt, snap7Types.WordLen.S7WLWord);
      }
    } catch (e) {
      console.log(array);
      console.log(e);
    }

    // console.log(localLogArray + " - " + element.name + " - " + promise1);

    data[localLogArray]["centerLines"][element.name] = promise1;

    //if null or undefined skip
    if (promise1 == null || promise1 == undefined) continue;

    var query = "update setPoints.request set current = ? , currentUpdateTime = ? where id = ?";

    let timeStamp = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");

    await mysql.query(query, [promise1, timeStamp, element.id]);

    if (promise1 != element.setPoint && element.timeOfIssue == null) {
      //Set point not right

      var date;
      date = new Date();
      date =
        date.getUTCFullYear() +
        "-" +
        ("00" + (date.getUTCMonth() + 1)).slice(-2) +
        "-" +
        ("00" + date.getUTCDate()).slice(-2) +
        " " +
        ("00" + date.getUTCHours()).slice(-2) +
        ":" +
        ("00" + date.getUTCMinutes()).slice(-2) +
        ":" +
        ("00" + date.getUTCSeconds()).slice(-2);

      timeStamp = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");

      var query = "update setPoints.request set timeOfIssue = ? where id = ?";

      await mysql.query(query, [timeStamp, element.id]);
    } else if (promise1 == element.setPoint) {
      var query = "update setPoints.request set timeOfIssue = null, comment = null, muteDate = null, commentAuthor = null where id = ?";

      await mysql.query(query, [element.id]);
    }
  }
}

const objectsEqual = (o1: any, o2: any) => Object.keys(o1).length === Object.keys(o2).length && Object.keys(o1).every((p) => o1[p] === o2[p]);
