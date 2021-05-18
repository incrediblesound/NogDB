// write_stream.js

import * as fs from 'fs'

export const flushData = (file, chunk, callback) => {
  return fs.writeFile(file, chunk, { flag: 'a' }, callback)
}

export const readChunk = (fileName: string, start: number, end: number) => {
  const file = fs.openSync(fileName, 'r')
  var buffer = Buffer.alloc(end-start+1)
  fs.readSync(file, buffer, 0, end-start, start)
  return buffer
}