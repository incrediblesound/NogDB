// write_stream.js

const fs = require('fs');

const flushData = (file, chunk, callback) => {
  let writeStream = fs.createWriteStream(file, { 'flags': 'a' });
  // write some data with a base64 encoding
  writeStream.write(chunk, 'utf8');
  // the finish event is emitted when all data has been flushed from the stream
  writeStream.on('finish', () => {
      callback()
  });
  // close the stream
  writeStream.end();
}

const readChunk = (file, start, end, callback) => {
  console.log(start, end)
  let readStream = fs.createReadStream(file, { start, end });
  let chunks = []
  // Handle any errors while reading
  readStream.on('error', err => {
      // File could not be read
      return callback(err);
  });

  readStream.on('data', chunk => {
    chunks.push(chunk);
  });

  readStream.on('close', () => {
    // Create a buffer of the image from the stream
    return callback(null, Buffer.concat(chunks));
  });
}

module.exports = {
  flushData,
  readChunk,
}