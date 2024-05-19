//Service for Dematic Dashboard Screwfix Carton Closing to DB = get lidder
//Created by: JWL
//Date: 2023/07/01
//Last modified: 2023/07/01 11:25:33

import snap7 from "node-snap7";
var s7client = new snap7.S7Client();

const lidderFaults = require("./lidderFaults");
const lidderFaultsLine1 = require("./lidderFaultsLine1");

function getLidderFaults(request: { machine: any; ip: any; line: any }) {
  var promise = new Promise(function (resolve, reject) {
    let machine = request.machine;
    let ip = request.ip;
    let line = request.line;

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

        let tempArray: any[] = [];
        tempArray["Local Log"] = [];
        //tempArray.connected = true;

        try {
          // console.log(res);
          for (let index = 0; index < 238 / 2; index++) {
            const element1 = res[index * 2];
            const element2 = res[index * 2 + 1];

            let faultHex = element1 + element2;

            let faultNumber = parseInt(faultHex, 16);
            let currentDBW = index * 2 + 16;

            if (line == 1) {
              if (currentDBW < 52) {
                tempArray["Local Log"][lidderFaultsLine1.lidderFaults[currentDBW]] = faultNumber;
              }
            } else {
              tempArray["Local Log"][lidderFaults.lidderFaults[currentDBW]] = faultNumber;
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

//export function
export { getLidderFaults };
