//Service for Dematic Dashboard Screwfix trentham to read date from PLCs
//Created by: JWL
//Date: 2023/02/02 21:27:41
//Last modified: 2023/05/17 08:59:21
//Version: 0.0.1

import snap7 from "node-snap7";
import snap7Types from "./types.js";

var s7client = new snap7.S7Client();

//enum for the different types of data that can be read from the PLC
enum DataType {
  Bit = 1,
  Byte = 2,
  Word = 3,
  DWord = 4,
  real = 5,
  timer = 6,
  counter = 7,
}

//read from a DB and convert to int
async function readFromS7DBToInt(ipAddress: string, rack: number, slot: number, dbNumber: number, offset: number, length: DataType) {
  return new Promise<number>((resolve, reject) => {
    try {
      // Create a new client and connect to the PLC
      var s7client = new snap7.S7Client();
      s7client.ConnectTo(ipAddress, rack, slot, function (err) {
        //if error fall to catch block in function
        if (err) {
          console.log("error: " + s7client.ErrorText(err));
          reject(s7client.ErrorText(err));
          return;
        }

        switch (length) {
          case DataType.Byte:
            // Read the data from the PLC
            s7client.ReadArea(snap7Types.Area.S7AreaDB, dbNumber, offset, 1, snap7Types.WordLen.S7WLByte, function (err, buffer) {
              if (err) {
                reject(s7client.ErrorText(err));

                return;
              }

              try {
                // Disconnect from the PLC
                s7client.Disconnect();

                let int = buffer.readUInt8(0);
                // Return the buffer
                resolve(int);
              } catch (error) {
                console.log(error);
                reject(error);
                return;
              }
            });
            break;

          case DataType.Word:
            // Read the data from the PLC
            s7client.ReadArea(snap7Types.Area.S7AreaDB, dbNumber, offset, 1, snap7Types.WordLen.S7WLWord, function (err, buffer) {
              if (err) {
                reject(s7client.ErrorText(err));
                return;
              }

              try {
                // Disconnect from the PLC
                s7client.Disconnect();

                let int = buffer.readUInt16BE(0);

                // Return the buffer
                resolve(int);
              } catch (error) {
                console.log(error);
                reject(error);
                return;
              }
            });
            break;

          case DataType.DWord:
            // Read the data from the PLC
            s7client.ReadArea(snap7Types.Area.S7AreaDB, dbNumber, offset, 1, snap7Types.WordLen.S7WLDWord, function (err, buffer) {
              if (err) {
                reject(s7client.ErrorText(err));
                return;
              }

              try {
                // Disconnect from the PLC
                s7client.Disconnect();

                let int = buffer.readUInt32BE(0);

                // Return the buffer
                resolve(int);
              } catch (error) {
                console.log(error);
                reject(error);
                return;
              }
            });
            break;
        }
      });
    } catch (error) {
      console.error(error);
      reject(error);
      return;
    }
  });
}

//export the function
export default { readFromS7DBToInt, DataType };
