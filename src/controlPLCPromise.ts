import snap7 from "node-snap7";
import { iPackFaults } from "./faultDefinitions/iPackFaults.js";
import { lidderFaults } from "./faultDefinitions/lidderFaults.js";
import { lidderFaultsLine1 } from "./faultDefinitions/lidderFaultsLine1.js";

import snap7Types from "./plc/types.js";

var s7client = new snap7.S7Client();

function getDoubleInt(request: { machine: any; ip: any; db: any; doubleInt: any }) {
  //console.log("1");
  //console.log(11111);
  var promise = new Promise(function (resolve, reject) {
    const machine = request.machine;
    const ip = request.ip;
    const db = request.db;
    const doubleInt = request.doubleInt;
    if (ip == undefined || db == undefined || doubleInt == undefined)
      reject({ success: false, try: "count", request, machine: machine, data: [], error: "Wrong Variables" });

    s7client.ConnectTo(ip, 0, 2, function (err: any) {
      if (err) {
        reject({ success: false, try: "count1", request, machine: machine, data: [], error: s7client.ErrorText(err) });
      }

      s7client.ReadArea(snap7Types.Area.S7AreaDB, db, doubleInt, 1, snap7Types.WordLen.S7WLDWord, function (err, res) {
        if (err) {
          reject({ success: false, try: "count2", request, machine: machine, data: [], error: s7client.ErrorText(err) });
        }
        try {
          const hexStringBoxes = res[0].toString(16) + res[1].toString(16) + res[2].toString(16) + res[3].toString(16);
          resolve({ success: true, machine: machine, data: parseInt(hexStringBoxes, 16) });
        } catch (err) {
          reject({ success: false, try: "count3", request, machine: machine, data: [], error: "Data NotFound" });
        }
      });
    });
  });

  return promise;
}

function getiPackFaults(request: { machine: any; ip: any }): Promise<any> {
  var promise = new Promise(function (resolve, reject) {
    const machine = request.machine;
    const ip = request.ip;

    if (ip == undefined) reject({ success: false, try: "faults", request, machine: machine, data: [], error: "Wrong Variables" });
    s7client.ConnectTo(ip, 0, 2, function (err: any) {
      if (err) {
        reject({ success: false, try: "faults", machine: machine, request, data: [], error: s7client.ErrorText(err) });
      }

      s7client.DBRead(301, 16, 242, function (err: any, res: any[]) {
        if (err) {
          reject({ success: false, try: "faults", machine: machine, request, data: [], error: s7client.ErrorText(err) });
        }

        const tempArray: any[] = [];
        tempArray["Local Log"] = [];
        // tempArray.connected = true;
        try {
          for (let index = 0; index < 242 / 2; index++) {
            const element1 = res[index * 2];
            const element2 = res[index * 2 + 1];

            const faultHex = element1 + element2;

            const faultNumber = parseInt(faultHex, 16);
            const currentDBW = index * 2 + 16;

            tempArray["Local Log"][iPackFaults[currentDBW]] = faultNumber;
          }
        } catch (err) {
          console.log(err);
          reject({ success: false, try: "faults", request, machine: machine, data: [], error: err });
        }
        resolve({ success: true, try: "faults", request, machine: machine, data: tempArray });
      });
    });
  });
  return promise;
}

function getLidderFaults(request: { machine: any; ip: any; line: any }): Promise<any> {
  var promise = new Promise(function (resolve, reject) {
    const machine = request.machine;
    const ip = request.ip;
    const line = request.line;

    if (ip == undefined) reject({ success: false, try: "faults1", request, machine: machine, data: [], error: "Wrong Variables" });

    s7client.ConnectTo(ip, 0, 2, function (err: any) {
      if (err) {
        reject({ success: false, try: "faults", request, machine: machine, data: [], error: s7client.ErrorText(err) });
      }

      let size = 242;
      if (line == 1) size = 51;
      s7client.DBRead(301, 16, size, function (err: any, res: any[]) {
        if (err) {
          reject({ success: false, try: "faults2", request, machine: machine, data: [], error: s7client.ErrorText(err) });
          return;
        }

        const tempArray: any[] = [];
        tempArray["Local Log"] = [];
        // tempArray.connected = true;

        try {
          // console.log(res);
          for (let index = 0; index < 238 / 2; index++) {
            const element1 = res[index * 2];
            const element2 = res[index * 2 + 1];

            const faultHex = element1 + element2;

            const faultNumber = parseInt(faultHex, 16);
            const currentDBW = index * 2 + 16;

            if (line == 1) {
              if (currentDBW < 52) {
                tempArray["Local Log"][lidderFaultsLine1[currentDBW]] = faultNumber;
              }
            } else {
              tempArray["Local Log"][lidderFaults[currentDBW]] = faultNumber;
            }
          }
        } catch (err) {
          // console.log(err);
          reject({ success: false, try: "faultsOK", request, machine: machine, line: line, data: [], error: err });
        }
        resolve({ success: true, try: "faults3", request, machine: machine, data: tempArray });
      });
    });
  });

  return promise;
}

function getS5Time(request: { machine: any; ip: any; db: any; doubleInt: any }) {
  var promise = new Promise(function (resolve, reject) {
    const machine = request.machine;
    const ip = request.ip;
    const db = request.db;
    const doubleInt = request.doubleInt;
    if (ip == undefined || db == undefined || doubleInt == undefined)
      reject({ success: false, try: "count", request, machine: machine, data: [], error: "Wrong Variables" });

    s7client.ConnectTo(ip, 0, 2, function (err: any) {
      if (err) {
        reject({ success: false, try: "count1", request, machine: machine, data: [], error: s7client.ErrorText(err) });
      }

      s7client.ReadArea(snap7Types.Area.S7AreaDB, db, doubleInt, 1, snap7Types.WordLen.S7WLWord, function (err: any, res: any) {
        if (err) {
          reject({ success: false, try: "count2", request, machine: machine, data: [], error: s7client.ErrorText(err) });
        }

        try {
          const hex = bytesToHexString(res);
          let main = parseInt(hex.substring(1, 4));

          switch (hex.substring(0, 1)) {
            case "0":
              main = main / 100;
              break;
            case "1":
              main = main / 10;
              break;
            case "2":
              main = main / 1;
              break;
            case "3":
              main = main / 0.1;
              break;
          }

          console.log(main);

          resolve({ success: true, machine: machine, data: main });
        } catch (err) {
          reject({ success: false, try: "count3", request, machine: machine, data: [], error: err });
        }
      });
    });
  });

  return promise;
}

function getMW(request: { machine: any; ip: any; doubleInt: any }) {
  var promise = new Promise(function (resolve, reject) {
    const machine = request.machine;
    const ip = request.ip;

    const doubleInt = request.doubleInt;
    if (ip == undefined || doubleInt == undefined)
      reject({ success: false, try: "count ", request, machine: machine, data: [], error: "Wrong Variables" });

    s7client.ConnectTo(ip, 0, 2, function (err: any) {
      if (err) {
        reject({ success: false, try: "count1", request, machine: machine, data: [], error: s7client.ErrorText(err) });
      }
      console.log(doubleInt);
      s7client.MBRead(doubleInt, 2, function (err, res) {
        if (err) {
          reject({ success: false, try: "count2", request, machine: machine, data: [], error: s7client.ErrorText(err) });
        }
        try {
          const hexStringBoxes = res[0].toString(16) + res[1].toString(16);
          resolve({ success: true, machine: machine, data: parseInt(hexStringBoxes, 16) });
        } catch (err) {
          reject({ success: false, try: "count3", request, machine: machine, data: [], error: "Data NotFound" });
        }
      });
    });
  });

  return promise;
}

//convert byte array to hex string
function bytesToHexString(arr: string | any[]) {
  var hex = "";
  for (var i = 0; i < arr.length; i++) {
    hex += (arr[i] >>> 4).toString(16);
    hex += (arr[i] & 0xf).toString(16);
  }
  return hex;
}

export { getDoubleInt, getiPackFaults, getLidderFaults, getS5Time, getMW };
