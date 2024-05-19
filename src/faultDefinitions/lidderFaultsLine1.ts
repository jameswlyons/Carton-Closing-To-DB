//Service for Dematic Dashboard Screwfix Carton Closing to DB = lidder faults for line 1
//Created by: JWL
//Date: 2023/07/01
//Last modified: 2023/07/02 11:43:24

const lidderFaultsLine1: any[] = [];

lidderFaultsLine1[0] = `DayNumber`;
lidderFaultsLine1[2] = `DateDay`;
lidderFaultsLine1[4] = `DateMonth`;
lidderFaultsLine1[6] = `DateYear`;
lidderFaultsLine1[8] = `TimeHr`;
lidderFaultsLine1[10] = `TimeMin`;
lidderFaultsLine1[12] = `TimeSec`;
lidderFaultsLine1[14] = `TimeMsecs`;
lidderFaultsLine1[16] = "D64EmergencyStop";
lidderFaultsLine1[18] = "D65CircuitBreaker";
lidderFaultsLine1[20] = "D66DoorOpened";
lidderFaultsLine1[22] = "D69GlueTankDefect";
lidderFaultsLine1[24] = "D70GlueStockLowLevelDefect";
lidderFaultsLine1[26] = "D71GlueTankNotReady";
lidderFaultsLine1[28] = "D73GeneralAirPressureDefect";
lidderFaultsLine1[30] = "D74IntroductionBoxDefect";
lidderFaultsLine1[32] = "D75CounterplaceInUpperPositionDefect";
lidderFaultsLine1[34] = "D76LidTransferredInPositionMissing";
lidderFaultsLine1[36] = "D78LidUnderCavityDefect";
lidderFaultsLine1[38] = "D81EmptyMagazineDefect";
lidderFaultsLine1[40] = "D82BoxMissingOnLift";
lidderFaultsLine1[42] = "D99CartonBlockingTimeoutDefect";
lidderFaultsLine1[44] = "D100CartonCenteringTimeoutDefect";
lidderFaultsLine1[46] = "D101?";
lidderFaultsLine1[50] = "box";

//export the array
export { lidderFaultsLine1 };
