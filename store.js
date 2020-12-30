// write_stream.js

const fs = require('fs');

const flushData = (file, chunk, callback) => {

  let writeStream = fs.createWriteStream(file, { 'flags': 'a' });

  writeStream.write(chunk, 'utf8');

  writeStream.on('finish', () => {
      callback()
  });

  writeStream.end();
}

const readChunk = (file, start, end, callback) => {
  console.log(start, end)
  let readStream = fs.createReadStream(file, { start, end });
  let chunks = []

  readStream.on('error', err => {
      return callback(err);
  });

  readStream.on('data', chunk => {
    chunks.push(chunk);
  });

  readStream.on('close', () => {
    return callback(null, Buffer.concat(chunks));
  });
}

module.exports = {
  flushData,
  readChunk,
}