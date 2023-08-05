const ConnectionType = {
  CONNTYPE_PG: 0x01,
  CONNTYPE_OP: 0x02,
  CONNTYPE_BASIC: 0x03,
};

const ParamNumber = {
  RemotePort: 2,
  PingTimeout: 3,
  SendTimeout: 4,
  RecvTimeout: 5,
  SrcRef: 7,
  DstRef: 8,
  SrcTSap: 9,
  PDURequest: 10,
};

//make array for area
const Area = {
  S7AreaPE: 0x81,
  S7AreaPA: 0x82,
  S7AreaMK: 0x83,
  S7AreaDB: 0x84,
  S7AreaCT: 0x1c,
  S7AreaTM: 0x1d,
};

const WordLen = {
  S7WLBit: 0x01,
  S7WLByte: 0x02,
  S7WLWord: 0x04,
  S7WLDWord: 0x06,
  S7WLReal: 0x08,
  S7WLCounter: 0x1c,
  S7WLTimer: 0x1d,
};

const BlockType = {
  Block_OB: 0x38,
  Block_DB: 0x41,
  Block_SDB: 0x42,
  Block_FC: 0x43,
  Block_SFC: 0x44,
  Block_FB: 0x45,
  Block_SFB: 0x46,
};

const SubBlockType = {
  SubBlk_OB: 0x08,
  SubBlk_DB: 0x0a,
  SubBlk_SDB: 0x0b,
  SubBlk_FC: 0x0c,
  SubBlk_SFC: 0x0d,
  SubBlk_FB: 0x0e,
  SubBlk_SFB: 0x0f,
};

const LangType = {
  BlockLangAWL: 0x01,
  BlockLangKOP: 0x02,
  BlockLangFUP: 0x03,
  BlockLangSCL: 0x04,
  BlockLangDB: 0x05,
  BlockLangGRAPH: 0x06,
};

const Status = {
  S7CpuStatusUnknown: 0x00,
  S7CpuStatusRun: 0x08,
  S7CpuStatusStop: 0x04,
};

export default {
  ConnectionType,
  ParamNumber,
  Area,
  WordLen,
  BlockType,
  SubBlockType,
  LangType,
  Status,
};
