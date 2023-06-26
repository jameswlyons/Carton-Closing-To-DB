//Service for Dematic Dashboard Screwfix trentham to collect data from WMS and push to DB - DB Connection
//Created by: JWL
//Date: 2022-12-30
//Last modified: 2023/03/05 19:08:19
//Version: 0.0.1

import * as mysql from "mysql";
//var mysql = require("mysql");

const pool = mysql.createPool({
  connectionLimit: 5, //important
  //host: "127.0.0.1",
  host: "10.4.5.227",
  user: "nodeUser",
  password: "nodeuser",
  database: "dematic_dashboard",
  debug: false,
});

//function to query the DB
export function query(sql: any, args?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    pool.query(sql, args, (err: any, rows: any) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

//export the functions
export default {
  query,
};
