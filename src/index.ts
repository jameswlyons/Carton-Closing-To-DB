//Service for Dematic Dashboard Screwfix
//Created by: JWL
//Date: 2023/02/02 02:51:41
//Last modified: 2023/06/26 21:53:10
//Version: 1.0.8

//import process tracker and start the process
import ProcessTracker from "./processTracker.js";
ProcessTracker.startProcess("");

//import dematic master library
//@ts-ignore
import dematic from "dematic-master-lib";

//imports
import cron from "node-cron";

//startup text
dematic.log("Dematic Dashboard Micro Service -");
dematic.log("Using Dematic Master Library Version: " + dematic.version);
