// write_stream.js

const fs = require('fs');

const flushData = (file, chunk, callback) => {
  return fs.writeFile(file, chunk, { flag: 'a' }, callback)
}

const readChunk = (file, start, end, callback) => {
  return fs.readFile(file, { start, end }, callback)
}

module.exports = {
  flushData,
  readChunk,
}