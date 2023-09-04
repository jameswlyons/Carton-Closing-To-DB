//Service for Dematic Dashboard Screwfix trentham to read data from PLC and convert to DB
//Created by: JWL
//Date: 2023/02/03 03:38:36
//Last modified: 2023/03/05 19:10:38
//Version: 0.0.1

//import plc
import plc from "./plc/plc.js";
import snap7Types from "./plc/types.js";

//import db
import mysql from "./../db/mysqlConnection.js";

snap7Types.Area;

//function to read data from PLC and convert to DB
async function plcToDB(ip: string, rack: number, slot: number, area: number, db: number, offset: number, type: number, dbName: string) {
  switch (area) {
    case snap7Types.Area.S7AreaDB:
      //read data from PLC
      await plc
        .readFromS7DBToInt(ip, rack, slot, db, offset, type)
        .then(async (result) => {
          //sql query to insert data into DB
          let sql =
            "INSERT INTO parameters (parameter, value, hidden) VALUES ('" +
            dbName +
            "', ? , 0) ON DUPLICATE KEY UPDATE value = ? , lastModified = current_timestamp() ";

          //insert data into DB
          let sqlResult = await mysql.query(sql, [result, result]);
        })
        .catch((err) => {
          console.log(err);
        });

      break;

    default:
      break;
  }
}

//export function
export default { plcToDB, DataType: plc.DataType };
