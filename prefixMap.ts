interface LogRecord {
  index: number;
  message: string;
}

export const prefixMap = (records: LogRecord[], map: Record<string, number[]>={}) => {
  records.forEach(word => {
    const prefix = word.message.substring(0, 4);
    if(!map[prefix]){
      map[prefix] = []
    }
    map[prefix].push(word.index)
  })
  return map
}