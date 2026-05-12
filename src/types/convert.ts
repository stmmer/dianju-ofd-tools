// 转换请求参数结构

export interface BaseData {
  SYS_ID?: string;
  SERIAL_NUMBER?: string;
}

export interface MetaData {
  IS_ASYN?: string;
  IS_MERGER?: string;
  PARAGRAPH_FLAG?: string;
  SPLIT_PAGES?: string;
}

export interface FileInfo {
  FILE_NO?: string;
  FILE_TYPE?: string;
  FILE_INDEX?: string;
  FILE_ATTRIBUTE?: string;
  CONVERT_TYPE?: string;
  REQUEST_TYPE?: string;
  FILE_PATH?: string;
}

export interface ConvertRequest {
  BASE_DATA: BaseData;
  META_DATA: MetaData;
  FILE_LIST: FileInfo[];
}

export interface ConvertResponse {
  FILE_INFO?: {
    RET_CODE?: number;
    RET_MSG?: string;
    FILE_URL?: string;
  };
}
