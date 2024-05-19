//Service for Dematic Dashboard Screwfix Carton Closing to DB
//Created by: JWL
//Date: 2023/07/01
//Last modified: 2023/10/08 11:05:19
//Version: 1.0.0

//import process tracker and start the process
import ProcessTracker from "./processTracker.js";
ProcessTracker.startProcess("cartonClosingToDb");

//import the database
import db from "./db/mysqlConnection.js";

import snap7 from "node-snap7";
import { iPackFaults } from "./faultDefinitions/iPackFaults.js";
import { lidderFaults } from "./faultDefinitions/lidderFaults.js";
import { lidderFaultsLine1 } from "./faultDefinitions/lidderFaultsLine1.js";

import snap7Types from "./plc/types.js";

//import dematic master library
//@ts-ignore
import dematic from "dematic-master-lib";

//imports
import cron from "node-cron";

//import controlPLCPromise
import * as controlPLCPromise from "./controlPLCPromise.js";
import { each } from "bluebird";

//startup text
dematic.log("Dematic Dashboard Micro Service -");
dematic.log("Using Dematic Master Library Version: " + dematic.version);
dematic.log("Starting Carton Closing to DB Service .... ");
dematic.log("Version: 1.0.0");

//function currently running
let currentlyRunning = false;

//create array to store all carton closing data
let cartonClosingData: any[] = [];

//get all carton closing data every 5 seconds
cron.schedule("*/2 * * * * *", () => {
  dematic.log("Running a task every 2 seconds");
  getAllCartonClosing();
});

//get all data from Carton Closing
async function getAllCartonClosing() {
  //if currently running, exit function
  if (currentlyRunning) {
    dematic.log("Currently running, exiting function");
    return;
  }

  //start time
  const startTime = new Date();

  //set currently running to true
  currentlyRunning = true;

  //get all carton closing data
  try {
    //let promisesGetMachines = [
    // await getBPlusMachine("10.4.2.151", "Line1Lidder", "Lidder", 1);
    // await getBPlusMachine("10.4.2.153", "Line2Lidder", "Lidder", 2);
    // await getBPlusMachine("10.4.2.155", "Line3Lidder", "Lidder", 3);
    // await getBPlusMachine("10.4.2.157", "Line4Lidder", "Lidder", 4);
    // await getBPlusMachine("10.4.2.150", "Line1iPack", "iPack", 1);
    // await getBPlusMachine("10.4.2.152", "Line2iPack", "iPack", 2);
    // await getBPlusMachine("10.4.2.154", "Line3iPack", "iPack", 3);
    // await getBPlusMachine("10.4.2.156", "Line4iPack", "iPack", 4);
    // ];

    let promisesGetMachines = [
      getBPlusMachine("10.4.2.151", "Line1Lidder", "Lidder", 1),
      getBPlusMachine("10.4.2.153", "Line2Lidder", "Lidder", 2),
      getBPlusMachine("10.4.2.155", "Line3Lidder", "Lidder", 3),
      getBPlusMachine("10.4.2.157", "Line4Lidder", "Lidder", 4),
      getBPlusMachine("10.4.2.150", "Line1iPack", "iPack", 1),
      getBPlusMachine("10.4.2.152", "Line2iPack", "iPack", 2),
      getBPlusMachine("10.4.2.154", "Line3iPack", "iPack", 3),
      getBPlusMachine("10.4.2.156", "Line4iPack", "iPack", 4),
    ];

    //wait for all to finish
    await Promise.all(promisesGetMachines);
  } catch (err: any) {
    console.log("Error getting machine" + err.machine + " faults");
    console.log(err);
  }

  //get the current time
  const currentTime = new Date();

  //get the time taken
  const timeTaken = currentTime.getTime() - startTime.getTime();

  //log the time taken
  dematic.log("Time taken: " + timeTaken + "ms");
  console.log("");
  console.log("");

  currentlyRunning = false;
}

//get Lidder Machine
async function getBPlusMachine(ipAddress: string, machineName: string, machineType: string, line: number) {
  var promise = new Promise(async function (resolve, reject) {
    //make request object
    const request = {
      machine: machineName,
      ip: ipAddress,
      line: line,
      machineType: machineType,
    };

    try {
      let results = await getBPlusMachineFaults(request);

      //console.log(results);

      //check if the machine exists in the carton closing data array
      if (cartonClosingData[machineName] == undefined) {
        //if it doesn't, add it
        cartonClosingData[machineName] = [];
      }

      //for each fault key in the results
      for (const fault in results) {
        //if this is the first time the machine has been run, (undefined)
        if (cartonClosingData[machineName][fault] == undefined) {
          cartonClosingData[machineName][fault] = results[fault];
          //resolve(true);
          continue;
        }

        //check if the key exists in the carton closing data array
        if (cartonClosingData[machineName][fault] == undefined) {
          //if it doesn't, add it
          cartonClosingData[machineName][fault] = results[fault];
          continue;
        }

        //difference between the current value and the value in the carton closing data array
        const difference = results[fault] - cartonClosingData[machineName][fault];
        //console.log(machineName + " - Fault: " + fault + " - " + difference);

        //if 0,  reset the value
        if (results[fault] == 0 && cartonClosingData[machineName][fault] != results[fault]) {
          //console.log("Resetting value" + machineName + " - " + fault);
          cartonClosingData[machineName][fault] = results[fault];
        } else {
          //if negative, skip,
          if (difference < 0) {
            //dconsole.log("Difference is negative, skipping" + machineName + " - " + fault);
            continue;
          }

          //check if the value is more than in the carton closing data array
          if (difference > 0) {
            //sync the value
            cartonClosingData[machineName][fault] = results[fault];

            //for (let index = 0; index < difference; index++) {
            //add the fault to the database
            console.log("Adding fault to database - " + machineName + " - " + fault + " - " + difference);
            await insertToMySQL(line, machineType, fault);
            //}
          }
        }
      }

      resolve(true);
    } catch (err) {
      //console.log("Error getting machine faults");
      reject({ machine: request.machine, err });
      console.log(err);
    }
  });
  return promise;
}

function getBPlusMachineFaults(request: { machine: string; ip: string; line: number; machineType: string }): Promise<any> {
  var promise = new Promise(async function (resolve, reject) {
    const machine = request.machine;
    const ip = request.ip;
    const line = request.line;

    if (ip == undefined) {
      console.log("ip undefined");
      reject({ machine: request.machine, err: "Wrong Variables" });
      return;
    }

    try {
      let returnedFaults = await ConnectToPlcToGetBPlusMachineFaults(request);

      resolve(returnedFaults);
    } catch (err) {
      //console.log("error getting faults" + machine + " - " + err);
      reject({ machine: request.machine, err });
      console.log(err);
    }
  });

  return promise;
}
async function ConnectToPlcToGetBPlusMachineFaults(request: { machine: string; ip: string; line: number; machineType: string }): Promise<any> {
  const machine = request.machine;
  const ip = request.ip;
  const line = request.line;

  var promise = new Promise(async function (resolve, reject) {
    //create new s7client
    var s7client = new snap7.S7Client();

    s7client.ConnectTo(ip, 0, 2, async function (err: any) {
      if (err) {
        //console.log("error connecting to plc " + ip + " " + s7client.ErrorText(err));
        reject({ machine: request.machine, err: s7client.ErrorText(err) });
        return;
      }

      let size = 242;
      if (line == 1 && request.machineType == "Lidder") size = 51;

      let returnedFaults = await ReadFaultsFromBPlusMachine(s7client, size, request);

      //destroy the s7client
      await s7client.Disconnect();

      resolve(returnedFaults);
      return;
    });
  });
  return promise;
}

function ReadFaultsFromBPlusMachine(
  s7client: snap7.S7Client,
  size: number,
  request: { machine: string; ip: string; line: number; machineType: string }
): Promise<any> {
  var promise = new Promise(function (resolve, reject) {
    s7client.DBRead(301, 16, size, function (err, res) {
      if (err) {
        // console.log("error reading from plc " + request.machine + " - " + s7client.ErrorText(err));
        reject({ machine: request.machine, err: s7client.ErrorText(err) });
        return;
      }

      //get the correct fault array
      let faultArray: string[] = getTheCorrectFaultListToUse(request);

      //use the correct fault array to get the correct fault names
      let tempArray = parseResultIntoFaultLog(res, request, faultArray);

      resolve(tempArray);
      return;
    });
  });
  return promise;
}
function parseResultIntoFaultLog(res: any, request: { machine: string; ip: string; line: number; machineType: string }, faultArray: any[]): number[] {
  let tempArray: number[] = [];
  for (let index = 0; index < 238 / 2; index++) {
    const element1 = res[index * 2];
    const element2 = res[index * 2 + 1];

    let faultHex = element1 + element2;

    let faultNumber = parseInt(faultHex, 16);
    let currentDBW = index * 2 + 16;

    if (request.machineType == "Lidder" && request.line == 1) {
      if (currentDBW > 52) {
        continue;
      }
    }
    //console.log(request.machineType + " = " + request.line + " = " + faultArray[currentDBW] + " = " + faultNumber);
    tempArray[faultArray[currentDBW]] = faultNumber;
  }

  return tempArray;
}

function getTheCorrectFaultListToUse(request: { machine: string; ip: string; line: number; machineType: string }): string[] {
  let faultArray: string[] = [];

  if (request.machineType == "Lidder") {
    if (request.line == 1) faultArray = lidderFaultsLine1;
    else faultArray = lidderFaults;
  } else if (request.machineType == "iPack") faultArray = iPackFaults;
  return faultArray;
}

function insertToMySQL(line: number, machineType: string, fault: string) {
  var query = "INSERT INTO cartonClosing.faults (line, machineType, fault) VALUES (?,?,?);";

  console.log("Inserting into database - " + line + " - " + machineType + " - " + fault);

  return db.query(query, [line, machineType, fault]).then(function (rows: string | any[]) {
    if (rows.length == 0) {
      return Promise.reject("did not inset fault");
    }

    return true;
  });
}
