//Service for Dematic Dashboard Screwfix
//Created by: JWL
//Date: 2023/02/02 02:51:41
//Last modified: 2023/08/05 10:34:02
//Version: 1.0.8

//import process tracker and start the process
//import ProcessTracker from "./processTracker.js";
//ProcessTracker.startProcess("");

//import dematic master library
//@ts-ignore
import dematic from "dematic-master-lib";
//imports
import cron from "node-cron";

//startup text
dematic.log("Dematic Dashboard Micro Service -");
dematic.log("Using Dematic Master Library Version: " + dematic.version);

//import process tracker and start the process
import ProcessTracker from "./processTracker.js";
ProcessTracker.startProcess("shuttleFaultsToDb");

import plcToDB from "./misc/plcToDB.js";

//import types
import snap7Types from "./misc/plc/types.js";

import plc from "./misc/plc/plc.js";
import snap7 from "node-snap7";
import { resolve } from "bluebird";
import mysqlConnection from "./db/mysqlConnection.js";

//amount of aisles and levels
const amountOfAisles = 3;
const amountOfLevels = 25;

//currently in fault array
let currentlyInFault: string[] = [];

//add all aisles and levels to the currently in fault array
for (let aisle = 1; aisle <= amountOfAisles; aisle++) {
  for (let level = 1; level <= amountOfLevels; level++) {
    currentlyInFault[aisle + "-" + level] = { fault: "false", id: 0 };
  }
}

//every 5 seconds, update
cron.schedule("*/5 * * * * *", async () => {
  //checkAllShuttleFaults();
});

setTimeout(() => {
  checkAllShuttleFaults();
}, 5000);

clearAllFaults();

//when starting, clear all faults in the db that are not resolved
async function clearAllFaults() {
  //build sql query to insert the fault into the database
  let sql =
    "UPDATE `newDmsShuttleFaults` SET `resolvedDate` = CURRENT_DATE(), `resolvedTime` = CURRENT_TIME(), `resolvedReason` = 'process restart' WHERE `resolvedDate` IS NULL;";
  let result = await mysqlConnection.query(sql);
  // console.log(result);
  dematic.log("Cleared all faults in db");
}

//currently checking all shuttles
let checkingAllShuttles = false;

async function checkAllShuttleFaults() {
  //if we are already checking all shuttles, return
  if (checkingAllShuttles) {
    dematic.log("Already checking all shuttles");
    return;
  }

  //set that we are checking all shuttles
  checkingAllShuttles = true;

  dematic.log("Updating PLC to DB");

  //start timer for the update
  const start = Date.now();

  //for each aisle
  // for (let aisle = 1; aisle <= 3; aisle++) {
  //   //check the aisle faults
  //   await checkAisleFaults(aisle);
  // }

  //connectToPLCToCheckShuttleFaults(2, 22);

  //make an array of promises for each aisle
  let promises: Promise<void>[] = [];

  //for each aisle
  for (let aisle = 1; aisle <= amountOfAisles; aisle++) {
    //for each level
    promises.push(checkAisleFaults(aisle));
  }

  //wait for all the promises to finish
  await Promise.all(promises);

  //end timer for the update
  const end = Date.now();

  //calculate the time taken
  const timeTaken = end - start;

  //console.log("PLC to DB update took " + timeTaken + "ms");

  //set that we are not checking all shuttles
  checkingAllShuttles = false;

  checkAllShuttleFaults();
}

async function checkAisleFaults(aisle: number) {
  //for each level
  for (let level = 1; level <= amountOfLevels; level++) {
    //console.log("Checking " + aisle + " - " + level);

    try {
      //check the shuttle faults
      await checkShuttleFaults(aisle, level);
    } catch (error) {}
  }
}

//check shuttle faults and then get more data if there are faults
async function checkShuttleFaults(aisle: number, level: number) {
  try {
    //connect to the plc
    let faults = await connectToPLCToCheckShuttleFaults(aisle, level);

    if (faults["rawFaultGroup"] != 0 && faults["rawFaultNumber"] != 0) {
      //get the mac address
      let shuttleData = await getShuttleData(aisle, level);

      //is this shuttle already in fault?
      if (currentlyInFault[aisle + "-" + level].fault == faults["rawFaultGroup"] + "-" + faults["rawFaultNumber"]) {
        console.log("Shuttle is already in same fault");
      } else {
        //were we in fault before?
        if (currentlyInFault[aisle + "-" + level].fault != "false") {
          console.log("Shuttle was in fault before, now different fault");

          //update the db to say that this shuttle is not in fault with the current time and date
          let sql1 =
            "UPDATE `newDmsShuttleFaults` SET `resolvedDate` = CURRENT_DATE(), `ResolvedTime` = CURRENT_TIME() WHERE `id` = " +
            currentlyInFault[aisle + "-" + level].id +
            ";";

          let result1 = await mysqlConnection.query(sql1);
          //  console.log(result1);
        } else {
          //get date and time
          let date = new Date();

          let mysqlDate = date.getFullYear() + "-" + paddy(date.getMonth().toString(), 2) + "-" + paddy(date.getDate().toString(), 2);
          let mysqlTime =
            paddy(date.getHours().toString(), 2) + ":" + paddy(date.getMinutes().toString(), 2) + ":" + paddy(date.getSeconds().toString(), 2);

          //build sql query to insert the fault into the database
          let sql =
            "INSERT INTO `newDmsShuttleFaults` (`aisle`, `level`, `faultGroup`, `faultNumber`, `macAddress`, `date`, `time`,`xLocation`,`wLocation`,`zLocation`) VALUES ('" +
            faults["aisle"] +
            "', '" +
            faults["level"] +
            "', '" +
            faults["rawFaultGroup"] +
            "', '" +
            faults["rawFaultNumber"] +
            "', '" +
            shuttleData["mac"] +
            "', '" +
            mysqlDate +
            "', '" +
            mysqlTime +
            "', '" +
            faults["currentX_pos"] +
            "', '" +
            faults["currentW_pos"] +
            "', '" +
            faults["currentZ1_pos"] +
            "');";

          let result = await mysqlConnection.query(sql);

          // console.log(result);
          console.log(
            "Added fault to database for " +
              faults["aisle"] +
              " - " +
              faults["level"] +
              " - " +
              faults["rawFaultGroup"] +
              "-" +
              faults["rawFaultNumber"]
          );

          //set that this shuttle is in fault
          currentlyInFault[aisle + "-" + level].fault = faults["rawFaultGroup"] + "-" + faults["rawFaultNumber"];
          //get id of the fault in the db
          currentlyInFault[aisle + "-" + level].id = result.insertId;

          console.log(currentlyInFault[aisle + "-" + level]);

          //we have a fault lets add it to the database
          //plcToDB.addFaultToDB(faults);

          //console.log(faults);
          //console.log(faults["aisle"] + " - " + faults["level"] + " - " + faults["xCoordinate"] + " - " + faults["currentX_pos"]);
        }
      }
    } else {
      // console.log("No fault");

      //set that this shuttle is not in fault

      //update the db to say that this shuttle is not in fault with the current time and date

      //if we were in fault before, update the db to say that this shuttle is not in fault with the current time and date
      if (currentlyInFault[aisle + "-" + level].fault != "false") {
        let sql =
          "UPDATE `newDmsShuttleFaults` SET `resolvedDate` = CURRENT_DATE(), `ResolvedTime` = CURRENT_TIME() , `resolvedReason` = 'automatic' WHERE `id` = " +
          currentlyInFault[aisle + "-" + level].id +
          ";";

        let result = await mysqlConnection.query(sql);
        //console.log(result);
      }

      currentlyInFault[aisle + "-" + level].fault = "false";
    }
  } catch (error) {
    // console.log("Error checking shuttle faults: " + error);
  }
}

async function connectToPLCToCheckShuttleFaults(aisle: number, level: number): Promise<string[]> {
  let offsetDBFaults = 78;

  return new Promise((resolve, reject) => {
    let aisleString = 100 + aisle;

    let ip = "10.4.2." + aisleString.toString();
    let rack = 0;
    let slot = 1;

    // console.log("Connecting to PLC: " + ip);

    let dbFaults = 836;
    let dbLastPos = 942;

    //connect to the plc
    let plcConnection = new snap7.S7Client();

    plcConnection.ConnectTo(ip, rack, slot, (err: any) => {
      //check for errors
      if (err) {
        //console.log("Error connecting to PLC: " + err);

        // console.log(plcConnection.ErrorText(err));
        reject(err);
        return;
      }

      //log that we are connected
      //console.log("Connected to PLC");

      let startOffset = (level - 1) * offsetDBFaults;

      //console.log("Reading from DB " + dbFaults + " at offset " + startOffset);

      plcConnection.ReadArea(snap7Types.Area.S7AreaDB, dbFaults, startOffset, 100, snap7Types.WordLen.S7WLDWord, (err, data) => {
        //check for errors
        if (err) {
          console.log("Error reading from PLC: " + err);

          console.log(plcConnection.ErrorText(err));
          reject(err);
          return;
        }

        // console.log(data);

        //lets make an array of the faults
        let faults: string[] = [];

        faults["LocalAisle"] = aisle.toString();
        faults["LocalLevel"] = level.toString();

        faults["aisle"] = data[0];
        faults["level"] = data[1];

        createShuttleMode(data, faults);
        createShuttleStatus(faults, data);
        createLoadStatus(faults, data);
        createPositionStatus(faults, data);
        createFingerStatus(faults, data);

        faults["RawOP"] = data[8];

        createOperationNotifications(faults, data);

        faults["rawFaultGroup"] = data[9];
        faults["rawFaultNumber"] = data[10];

        createFaults(faults, data);

        createOrderStep(faults, data);

        faults["activeOrderID"] = data[12];
        faults["waitingOrderID"] = data[13];

        faults["currentX_pos"] = s74BytesToNumber(data[16], data[17], data[18], data[19]);

        faults["currentX_speed"] = s72BytesToNumber(data[20], data[21]);

        faults["currentW_pos"] = s72BytesToNumber(data[22], data[23]);
        faults["currentW_speed"] = s72BytesToNumber(data[24], data[25]);

        faults["currentZ1_pos"] = s72BytesToNumber(data[26], data[27]);
        faults["currentZ1_speed"] = s72BytesToNumber(data[28], data[29]);

        faults["currentZ2_pos"] = s72BytesToNumber(data[30], data[31]);
        faults["currentZ2_speed"] = s72BytesToNumber(data[32], data[33]);

        //console.log(faults);
        //console.log(faults["aisle"] + " - " + faults["level"] + " - " + faults["xCoordinate"] + " - " + faults["currentX_pos"]);
        resolve(faults);
      });
    });
  });
}

function getShuttleData(aisle: number, level: number) {
  return new Promise<any>(function (resolve, reject) {
    let plcConnection = new snap7.S7Client();

    plcConnection.ConnectTo("10.4.2." + (100 + aisle), 0, 1, async function (err) {
      if (err) reject(plcConnection.ErrorText(err));

      plcConnection.ReadArea(0x84, 2850 + level, 1528, 8, 0x02, function (err, data) {
        if (err) reject(plcConnection.ErrorText(err));

        let tempArray = {
          aisle: aisle,
          level: level,
          mac: stringToCapital(toHexString(data)),
        };
        resolve(tempArray);
      });
    });

    //return promise;
  });
}

function stringToCapital(string: string) {
  return string.toUpperCase();
}

function toHexString(byteArray: Buffer) {
  if (byteArray == null || byteArray.length == 0) return "";
  if (byteArray.length == 0) return "";
  var result = "";

  return Array.from(byteArray, function (byte) {
    return ("0" + (byte & 0xff).toString(16)).slice(-2);
  }).join(" ");
}
function paddy(n: string, p: number, c?: undefined) {
  var pad_char = typeof c !== "undefined" ? c : "0";
  var pad = new Array(1 + p).join(pad_char);
  return (pad + n).slice(-pad.length);
}

function createOrderStep(faults: string[], data: Buffer) {
  faults["orderStep"] = data[11];
  //0 = no order, 1 = order running, 2 = order finished, 3 = order aborted
  switch (data[11]) {
    case 1:
      faults["orderStep"] = "Order running";
      break;
    case 2:
      faults["orderStep"] = "Order finished";
      break;
    case 3:
      faults["orderStep"] = "Order aborted";
      break;
    default:
      faults["orderStep"] = "No order";
      break;
  }
}

function createShuttleMode(data: Buffer, faults: string[]) {
  //faults["mode"] = data[2];
  //if the mode is 1 then we are in auto mode, 2 is manual mode
  if (data[2] == 1) {
    faults["mode"] = "Auto";
  } else if (data[2] == 2) {
    faults["mode"] = "Manual";
  }
}

function createFaults(faults: string[], data: Buffer) {
  faults["faultGroup"] = data[9];
  faults["faultNumber"] = data[10];

  // 25	System faults
  // 26	General faults
  // 27	X axis faults
  // 28	Z1 axis faults
  // 29	Z2 axis faults
  // 30	W axis faults

  switch (data[9]) {
    case 25:
      faults["faultGroup"] = "System faults";

      switch (data[10]) {
        //1	Communication failure on can bus to IO-Controller
        // 101	Communication failure on can bus to Linux-Board
        // 102	IO controller not ready
        // 103	24V voltage not available
        // 104	Safety circuit active
        // 105	Communication failure on ASI1 finger card 1
        // 106	Communication failure on ASI1 finger card 2
        // 107	Communication failure on ASI2 finger card 1
        // 108	Communication failure on ASI2 finger card 2
        // 111	File access error “Parameter files”
        // 112	File access error “SD-Card”
        // 113	File access error “System-Flash”
        // 114	Undervoltage detected

        case 1:
          faults["faultNumber"] = "Communication failure on can bus to IO-Controller";
          break;
        case 101:
          faults["faultNumber"] = "Communication failure on can bus to Linux-Board";
          break;
        case 102:
          faults["faultNumber"] = "IO controller not ready";
          break;
        case 103:
          faults["faultNumber"] = "24V voltage not available";
          break;
        case 104:
          faults["faultNumber"] = "Safety circuit active";
          break;
        case 105:
          faults["faultNumber"] = "Communication failure on ASI1 finger card 1";
          break;
        case 106:
          faults["faultNumber"] = "Communication failure on ASI1 finger card 2";
          break;
        case 107:
          faults["faultNumber"] = "Communication failure on ASI2 finger card 1";
          break;
        case 108:
          faults["faultNumber"] = "Communication failure on ASI2 finger card 2";
          break;
        case 111:
          faults["faultNumber"] = "File access error “Parameter files”";
          break;
        case 112:
          faults["faultNumber"] = "File access error “SD-Card”";
          break;
        case 113:
          faults["faultNumber"] = "File access error “System-Flash”";
          break;
        case 114:
          faults["faultNumber"] = "Undervoltage detected";
          break;
        default:
          faults["faultNumber"] = "No fault number";
      }

      break;
    case 26:
      faults["faultGroup"] = "General faults";

      //1	Shuttle is loaded and should pick
      // 2	Shuttle is not loaded and should drop
      // 3	Current level and order level do not match (deprecated)
      // 4	New order but no order buffer free (deprecated)
      // 5	Stop bracket not engaged
      // 6	Shuttle is loaded, shift load not allowed
      // 11	Load overhang detected on left side
      // 12	Load overhang detected on right side
      // 13	Load overhang detected on both sides
      // 14	Load overhang sensor still active while extending telescope
      // 21	Shuttle is empty after pick
      // 22	Shuttle is still loaded after drop
      // 23	Compartment still occupied after pick (deprecated)
      // 24	Compartment not occupied after drop (deprecated)
      // 31	Run time error open finger 1
      // 32	Run time error close finger 1
      // 33	Run time error open finger 2
      // 34	Run time error close finger 2
      // 35	Run time error open finger 3
      // 36	Run time error close finger 3
      // 37	Run time error open finger 4
      // 38	Run time error close finger 4
      // 39	Gap between boxes too small

      switch (data[10]) {
        case 1:
          faults["faultNumber"] = "Shuttle is loaded and should pick";
          break;
        case 2:
          faults["faultNumber"] = "Shuttle is not loaded and should drop";
          break;
        case 3:
          faults["faultNumber"] = "Current level and order level do not match (deprecated)";
          break;
        case 4:
          faults["faultNumber"] = "New order but no order buffer free (deprecated)";
          break;
        case 5:
          faults["faultNumber"] = "Stop bracket not engaged";
          break;
        case 6:
          faults["faultNumber"] = "Shuttle is loaded, shift load not allowed";
          break;
        case 11:
          faults["faultNumber"] = "Load overhang detected on left side";
          break;
        case 12:
          faults["faultNumber"] = "Load overhang detected on right side";
          break;
        case 13:
          faults["faultNumber"] = "Load overhang detected on both sides";
          break;
        case 14:
          faults["faultNumber"] = "Load overhang sensor still active while extending telescope";
          break;
        case 21:
          faults["faultNumber"] = "Shuttle is empty after pick";
          break;
        case 22:
          faults["faultNumber"] = "Shuttle is still loaded after drop";
          break;
        case 23:
          faults["faultNumber"] = "Compartment still occupied after pick (deprecated)";
          break;
        case 24:
          faults["faultNumber"] = "Compartment not occupied after drop (deprecated)";
          break;
        case 31:
          faults["faultNumber"] = "Run time error open finger 1";
          break;
        case 32:
          faults["faultNumber"] = "Run time error close finger 1";
          break;
        case 33:
          faults["faultNumber"] = "Run time error open finger 2";
          break;
        case 34:
          faults["faultNumber"] = "Run time error close finger 2";
          break;
        case 35:
          faults["faultNumber"] = "Run time error open finger 3";
          break;
        case 36:
          faults["faultNumber"] = "Run time error close finger 3";
          break;
        case 37:
          faults["faultNumber"] = "Run time error open finger 4";
          break;
        case 38:
          faults["faultNumber"] = "Run time error close finger 4";
          break;
        case 39:
          faults["faultNumber"] = "Gap between boxes too small";
          break;
        default:
          faults["faultNumber"] = "No fault number";
      }

      break;
    case 27:
      faults["faultGroup"] = "X axis faults";
      // 1	Axis is unable to position in target window
      // 2	Axis run time has been exceeded
      // 101	Following window to large
      // 102	Target approach error
      // 103	Axis is outside of standstill range
      // 104	Direction error of encoder rotation
      // 105	Motor temperature too high
      // 106	Destination outside axis limits
      // 107	Max duration of peak current exceeded
      // 108	Axis is not homed
      // 109	Position correction is out of range
      // 110	Slip value is out of range
      // 121	Amplifier communication timeout
      // 122	Hall sensor error
      // 123	Over current detected
      // 124	Over voltage detected
      // 125	Under voltage detected (deprecated)
      // 126	12V voltage not available
      // 127	Invalid encoder value change
      // 141	Amplifier unknown internal error
      // 21	Axis run time on homing has been exceeded
      // 22	Axis run time on teaching has been exceeded
      // 23	Sensor aisle start actuated during positioning (deprecated)
      // 24	Sensor aisle end actuated during positioning (deprecated)
      // 25	Axis can not run, telescope not centered

      switch (data[10]) {
        case 1:
          faults["faultNumber"] = "Axis is unable to position in target window";
          break;
        case 2:
          faults["faultNumber"] = "Axis run time has been exceeded";
          break;
        case 101:
          faults["faultNumber"] = "Following window to large";
          break;
        case 102:
          faults["faultNumber"] = "Target approach error";
          break;
        case 103:
          faults["faultNumber"] = "Axis is outside of standstill range";
          break;
        case 104:
          faults["faultNumber"] = "Direction error of encoder rotation";
          break;
        case 105:
          faults["faultNumber"] = "Motor temperature too high";
          break;
        case 106:
          faults["faultNumber"] = "Destination outside axis limits";
          break;
        case 107:
          faults["faultNumber"] = "Max duration of peak current exceeded";
          break;
        case 108:
          faults["faultNumber"] = "Axis is not homed";
          break;
        case 109:
          faults["faultNumber"] = "Position correction is out of range";
          break;
        case 110:
          faults["faultNumber"] = "Slip value is out of range";
          break;
        case 121:
          faults["faultNumber"] = "Amplifier communication timeout";
          break;
        case 122:
          faults["faultNumber"] = "Hall sensor error";
          break;
        case 123:
          faults["faultNumber"] = "Over current detected";
          break;
        case 124:
          faults["faultNumber"] = "Over voltage detected";
          break;
        case 125:
          faults["faultNumber"] = "Under voltage detected (deprecated)";
          break;
        case 126:
          faults["faultNumber"] = "12V voltage not available";
          break;
        case 127:
          faults["faultNumber"] = "Invalid encoder value change";
          break;
        case 141:
          faults["faultNumber"] = "Amplifier unknown internal error";
          break;
        case 21:
          faults["faultNumber"] = "Axis run time on homing has been exceeded";
          break;
        case 22:
          faults["faultNumber"] = "Axis run time on teaching has been exceeded";
          break;
        case 23:
          faults["faultNumber"] = "Sensor aisle start actuated during positioning (deprecated)";
          break;
        case 24:
          faults["faultNumber"] = "Sensor aisle end actuated during positioning (deprecated)";
          break;
        case 25:
          faults["faultNumber"] = "Axis can not run, telescope not centered";
          break;
        default:
          faults["faultNumber"] = "No fault number";
      }

      break;
    case 28:
      faults["faultGroup"] = "Z1 axis faults";

      // 1	Axis is unable to position in target window
      // 2	Axis run time has been exceeded
      // 101	Following window to large
      // 102	Target approach error
      // 103	Axis is outside of standstill range
      // 104	Direction error of encoder rotation
      // 105	Motor temperature too high
      // 106	Destination outside axis limits
      // 107	Max duration of peak current exceeded
      // 108	Axis is not homed
      // 109	Position correction is out of range
      // 110	Slip value is out of range
      // 121	Amplifier communication timeout
      // 122	Hall sensor error
      // 123	Over current detected
      // 124	Over voltage detected
      // 125	Under voltage detected (deprecated)
      // 126	12V voltage not available
      // 127	Invalid encoder value change
      // 141	Amplifier unknown internal error
      // 31	Axis run time on homing has been exceeded
      // 32	Axis can not run, x-axis not positioned
      // 33	Axis can not run, fingers not positioned (deprecated)

      switch (data[10]) {
        case 1:
          faults["faultNumber"] = "Axis is unable to position in target window";
          break;
        case 2:
          faults["faultNumber"] = "Axis run time has been exceeded";
          break;
        case 101:
          faults["faultNumber"] = "Following window to large";
          break;
        case 102:
          faults["faultNumber"] = "Target approach error";
          break;
        case 103:
          faults["faultNumber"] = "Axis is outside of standstill range";
          break;
        case 104:
          faults["faultNumber"] = "Direction error of encoder rotation";
          break;
        case 105:
          faults["faultNumber"] = "Motor temperature too high";
          break;
        case 106:
          faults["faultNumber"] = "Destination outside axis limits";
          break;
        case 107:
          faults["faultNumber"] = "Max duration of peak current exceeded";
          break;
        case 108:
          faults["faultNumber"] = "Axis is not homed";
          break;
        case 109:
          faults["faultNumber"] = "Position correction is out of range";
          break;
        case 110:
          faults["faultNumber"] = "Slip value is out of range";
          break;
        case 121:
          faults["faultNumber"] = "Amplifier communication timeout";
          break;
        case 122:
          faults["faultNumber"] = "Hall sensor error";
          break;
        case 123:
          faults["faultNumber"] = "Over current detected";
          break;
        case 124:
          faults["faultNumber"] = "Over voltage detected";
          break;
        case 125:
          faults["faultNumber"] = "Under voltage detected (deprecated)";
          break;
        case 126:
          faults["faultNumber"] = "12V voltage not available";
          break;
        case 127:
          faults["faultNumber"] = "Invalid encoder value change";
          break;
        case 141:
          faults["faultNumber"] = "Amplifier unknown internal error";
          break;
        case 31:
          faults["faultNumber"] = "Axis run time on homing has been exceeded";
          break;
        case 32:
          faults["faultNumber"] = "Axis can not run, x-axis not positioned";
          break;
        case 33:
          faults["faultNumber"] = "Axis can not run, fingers not positioned (deprecated)";
          break;
        default:
          faults["faultNumber"] = "No fault number";
      }

      break;
    case 29:
      faults["faultGroup"] = "Z2 axis faults";

      // 1	Axis is unable to position in target window
      // 2	Axis run time has been exceeded
      // 101	Following window to large
      // 102	Target approach error
      // 103	Axis is outside of standstill range
      // 104	Direction error of encoder rotation
      // 105	Motor temperature too high
      // 106	Destination outside axis limits
      // 107	Max duration of peak current exceeded
      // 108	Axis is not homed
      // 109	Position correction is out of range
      // 110	Slip value is out of range
      // 121	Amplifier communication timeout
      // 122	Hall sensor error
      // 123	Over current detected
      // 124	Over voltage detected
      // 125	Under voltage detected (deprecated)
      // 126	12V voltage not available
      // 127	Invalid encoder value change
      // 141	Amplifier unknown internal error
      // 31	Axis run time on homing has been exceeded
      // 32	Axis can not run, x-axis not positioned
      // 33	Axis can not run, fingers not positioned (deprecated)

      switch (data[10]) {
        case 1:
          faults["faultNumber"] = "Axis is unable to position in target window";
          break;
        case 2:
          faults["faultNumber"] = "Axis run time has been exceeded";
          break;
        case 101:
          faults["faultNumber"] = "Following window to large";
          break;
        case 102:
          faults["faultNumber"] = "Target approach error";
          break;
        case 103:
          faults["faultNumber"] = "Axis is outside of standstill range";
          break;
        case 104:
          faults["faultNumber"] = "Direction error of encoder rotation";
          break;
        case 105:
          faults["faultNumber"] = "Motor temperature too high";
          break;
        case 106:
          faults["faultNumber"] = "Destination outside axis limits";
          break;
        case 107:
          faults["faultNumber"] = "Max duration of peak current exceeded";
          break;
        case 108:
          faults["faultNumber"] = "Axis is not homed";
          break;
        case 109:
          faults["faultNumber"] = "Position correction is out of range";
          break;
        case 110:
          faults["faultNumber"] = "Slip value is out of range";
          break;
        case 121:
          faults["faultNumber"] = "Amplifier communication timeout";
          break;
        case 122:
          faults["faultNumber"] = "Hall sensor error";
          break;
        case 123:
          faults["faultNumber"] = "Over current detected";
          break;
        case 124:
          faults["faultNumber"] = "Over voltage detected";
          break;
        case 125:
          faults["faultNumber"] = "Under voltage detected (deprecated)";
          break;
        case 126:
          faults["faultNumber"] = "12V voltage not available";
          break;
        case 127:
          faults["faultNumber"] = "Invalid encoder value change";
          break;
        case 141:
          faults["faultNumber"] = "Amplifier unknown internal error";
          break;
        case 31:
          faults["faultNumber"] = "Axis run time on homing has been exceeded";
          break;
        case 32:
          faults["faultNumber"] = "Axis can not run, x-axis not positioned";
          break;
        case 33:
          faults["faultNumber"] = "Axis can not run, fingers not positioned (deprecated)";
          break;
        default:
          faults["faultNumber"] = "No fault number";
      }

      break;
    case 30:
      faults["faultGroup"] = "W axis faults";

      // 1	Axis is unable to position in target window
      // 2	Axis run time has been exceeded
      // 101	Following window to large
      // 102	Target approach error
      // 103	Axis is outside of standstill range
      // 104	Direction error of encoder rotation
      // 105	Motor temperature too high
      // 106	Destination outside axis limits
      // 107	Max duration of peak current exceeded
      // 108	Axis is not homed
      // 109	Position correction is out of range
      // 110	Slip value is out of range
      // 121	Amplifier communication timeout
      // 122	Hall sensor error
      // 123	Over current detected
      // 124	Over voltage detected
      // 125	Under voltage detected (deprecated)
      // 126	12V voltage not available
      // 127	Invalid encoder value change
      // 141	Amplifier unknown internal error
      // 41	Axis run time on homing has been exceeded
      // 42	Axis can not run, shuttle is loaded
      // 43	Move Flex axis not allowed if shuttle is loaded

      switch (data[10]) {
        case 1:
          faults["faultNumber"] = "Axis is unable to position in target window";
          break;
        case 2:
          faults["faultNumber"] = "Axis run time has been exceeded";
          break;
        case 101:
          faults["faultNumber"] = "Following window to large";
          break;
        case 102:
          faults["faultNumber"] = "Target approach error";
          break;
        case 103:
          faults["faultNumber"] = "Axis is outside of standstill range";
          break;
        case 104:
          faults["faultNumber"] = "Direction error of encoder rotation";
          break;
        case 105:
          faults["faultNumber"] = "Motor temperature too high";
          break;
        case 106:
          faults["faultNumber"] = "Destination outside axis limits";
          break;
        case 107:
          faults["faultNumber"] = "Max duration of peak current exceeded";
          break;
        case 108:
          faults["faultNumber"] = "Axis is not homed";
          break;
        case 109:
          faults["faultNumber"] = "Position correction is out of range";
          break;
        case 110:
          faults["faultNumber"] = "Slip value is out of range";
          break;
        case 121:
          faults["faultNumber"] = "Amplifier communication timeout";
          break;
        case 122:
          faults["faultNumber"] = "Hall sensor error";
          break;
        case 123:
          faults["faultNumber"] = "Over current detected";
          break;
        case 124:
          faults["faultNumber"] = "Over voltage detected";
          break;
        case 125:
          faults["faultNumber"] = "Under voltage detected (deprecated)";
          break;
        case 126:
          faults["faultNumber"] = "12V voltage not available";
          break;
        case 127:
          faults["faultNumber"] = "Invalid encoder value change";
          break;
        case 141:
          faults["faultNumber"] = "Amplifier unknown internal error";
          break;
        case 41:
          faults["faultNumber"] = "Axis run time on homing has been exceeded";
          break;
        case 42:
          faults["faultNumber"] = "Axis can not run, shuttle is loaded";
          break;
        case 43:
          faults["faultNumber"] = "Move Flex axis not allowed if shuttle is loaded";
          break;
        default:
          faults["faultNumber"] = "No fault number";
      }

      break;
    default:
      faults["faultGroup"] = "No fault group";
      faults["faultNumber"] = "No fault number";
      break;
  }
}

function createOperationNotifications(faults: string[], data: Buffer) {
  faults["operatingNotification"] = data[8];

  //1	Automatic order in manual mode not allowed
  // 2	Manual order in automatic mode not allowed
  // 3	Manual order not allowed, another axis is already running
  // 4	New order but shuttle is faulted
  // 5	Telescope is not in center position
  // 6	X-Axis is not in position
  // 7	Fingers are not in position
  // 8	Axes are not ready
  // 9	X-Axis is not taught
  // 11	Order data are not complete
  // 51	Homing, but homing still active
  // 52	Teaching, but teaching still active
  // 53	Teaching, but down-loading still active
  // 54	Positioning, but positioning still active
  // 55	Pick, but pick still active
  // 56	Drop, but drop still active
  // 57	Shift, but shift still active

  switch (data[8]) {
    case 1:
      faults["operatingNotification"] = "Automatic order in manual mode not allowed";
      break;
    case 2:
      faults["operatingNotification"] = "Manual order in automatic mode not allowed";
      break;
    case 3:
      faults["operatingNotification"] = "Manual order not allowed, another axis is already running";
      break;
    case 4:
      faults["operatingNotification"] = "New order but shuttle is faulted";
      break;
    case 5:
      faults["operatingNotification"] = "Telescope is not in center position";
      break;
    case 6:
      faults["operatingNotification"] = "X-Axis is not in position";
      break;
    case 7:
      faults["operatingNotification"] = "Fingers are not in position";
      break;
    case 8:
      faults["operatingNotification"] = "Axes are not ready";
      break;
    case 9:
      faults["operatingNotification"] = "X-Axis is not taught";
      break;
    case 11:
      faults["operatingNotification"] = "Order data are not complete";
      break;
    case 51:
      faults["operatingNotification"] = "Homing, but homing still active";
      break;
    case 52:
      faults["operatingNotification"] = "Teaching, but teaching still active";
      break;
    case 53:
      faults["operatingNotification"] = "Teaching, but down-loading still active";
      break;
    case 54:
      faults["operatingNotification"] = "Positioning, but positioning still active";
      break;
    case 55:
      faults["operatingNotification"] = "Pick, but pick still active";
      break;
    case 56:
      faults["operatingNotification"] = "Drop, but drop still active";
      break;
    case 57:
      faults["operatingNotification"] = "Shift, but shift still active";
      break;
    default:
      faults["operatingNotification"] = "No operating notification";
      break;
  }
}

function createFingerStatus(faults: string[], data: Buffer) {
  faults["fingerStatus"] = {};
  faults["fingerStatus"]["fingerUpStatus"] = {};
  //bit0 = pair 1 up, bit1 = pair 2 up, bit2 = pair 3 up, bit3 = pair 4 up
  //turn byte into bits
  let fingerUpStatus = data[6].toString(2).padStart(8, "0");
  faults["fingerStatus"]["fingerUpStatus"].pair1 = fingerUpStatus[7] === "1" ? "Yes" : "No";
  faults["fingerStatus"]["fingerUpStatus"].pair2 = fingerUpStatus[6] === "1" ? "Yes" : "No";
  faults["fingerStatus"]["fingerUpStatus"].pair3 = fingerUpStatus[5] === "1" ? "Yes" : "No";
  faults["fingerStatus"]["fingerUpStatus"].pair4 = fingerUpStatus[4] === "1" ? "Yes" : "No";

  faults["fingerStatus"]["fingerDownStatus"] = {};
  //bit0 = pair 1 down, bit1 = pair 2 down, bit2 = pair 3 down, bit3 = pair 4 down
  //turn byte into bits
  let fingerDownStatus = data[7].toString(2).padStart(8, "0");
  faults["fingerStatus"]["fingerDownStatus"].pair1 = fingerDownStatus[7] === "1" ? "Yes" : "No";
  faults["fingerStatus"]["fingerDownStatus"].pair2 = fingerDownStatus[6] === "1" ? "Yes" : "No";
  faults["fingerStatus"]["fingerDownStatus"].pair3 = fingerDownStatus[5] === "1" ? "Yes" : "No";
  faults["fingerStatus"]["fingerDownStatus"].pair4 = fingerDownStatus[4] === "1" ? "Yes" : "No";
}

function createPositionStatus(faults: string[], data: Buffer) {
  faults["positionStatus"] = {};
  //bit0 = x positioned on target, bit1 = z centered, bit3 = w positioned on target
  let positionStatus = data[5].toString(2).padStart(8, "0");
  faults["positionStatus"].xPositioned = positionStatus[7] === "1" ? "Yes" : "No";
  faults["positionStatus"].zCentered = positionStatus[6] === "1" ? "Yes" : "No";
  faults["positionStatus"].wPositioned = positionStatus[4] === "1" ? "Yes" : "No";
}

function createLoadStatus(faults: string[], data: Buffer) {
  faults["loadStatus"] = {};
  //0 = not loaded, bit0 = sensor 1 blocked, bit1 = sensor 2 blocked
  //turn byte into bits
  let loadStatus = data[4].toString(2).padStart(8, "0");

  //console.log(loadStatus);
  //if the bit is 1 then the shuttle is configured
  faults["loadStatus"].loaded = loadStatus[7] === "1" ? "Yes" : "No";
  faults["loadStatus"].sensor1Blocked = loadStatus[0] === "1" ? "Yes" : "No";
  faults["loadStatus"].sensor2Blocked = loadStatus[1] === "1" ? "Yes" : "No";
}

function createShuttleStatus(faults: string[], data: Buffer) {
  faults["shuttleStatus"] = {};
  //shuttle status - bit0 = configured, bit1 = homed, bit2 = taught, bit3 = on lift, bit5 = maint v
  //turn byte into bits
  let shuttleStatus = data[3].toString(2).padStart(8, "0");
  faults["shuttleStatus"].configured = shuttleStatus[7] === "1" ? "Yes" : "No";
  faults["shuttleStatus"].homed = shuttleStatus[6] === "1" ? "Yes" : "No";
  faults["shuttleStatus"].taught = shuttleStatus[5] === "1" ? "Yes" : "No";
  faults["shuttleStatus"].onLift = shuttleStatus[4] === "1" ? "Yes" : "No";
  faults["shuttleStatus"].maintMode = shuttleStatus[2] === "1" ? "Yes" : "No";
}

//s7 dint to number
function s7DintToNumber(buffer: Buffer) {
  //convert the buffer to a number
  let value = buffer.readInt32BE();

  //return the value
  return value;
}

//s7 dint to number
function s74BytesToNumber(byte1: number, byte2: number, byte3: number, byte4: number) {
  //combine the bytes and read as readUInt32BE
  //make into buffer
  const buffer = Buffer.from([byte1, byte2, byte3, byte4]);

  return buffer.readUInt32BE();
}

//s7 dint to number
function s72BytesToNumber(byte1: number, byte2: number) {
  //combine the bytes and read as readUInt32BE
  //make into buffer
  const buffer = Buffer.from([byte1, byte2]);

  return buffer.readUInt16BE();
}

//s7 byte to number
function s7ByteToNumber(buffer: Buffer) {
  //convert the buffer to a number
  let value = buffer.readInt8();

  //return the value
  return value;
}
