const fs = require('fs');
const { flushData } = require('./store');
const { newDatabase } = require('./templates/newDB')
const { pageFile, pageMap } = require('./templates/page')
const axios = require('axios');

const { Command } = require('commander');
const program = new Command();
program.version('0.0.1');

program
  .option('-n, --new-topic <name>', 'create a new topic')
  .option('-f, --folder <path>', 'set folder for data')
  .option('-g, --get <id>', 'get a message by id')
  // .option('-l, --load <name>', 'load a database')
  .option('-p, --publish <message>', 'send a message')
  .option('-s, --page-size <size>', 'set page size')
  .option('-t, --topic <name>', 'specify the topic')
  .option('-D, --delete <name>', 'delete a topic')

program.parse(process.argv);

if (program.newTopic) {
  const topicName = program.newTopic;
  const folder = program.folder || topicName;
  const pageSize = program.pageSize || 1000;
  return axios.post('http://localhost:3000/new-topic', {
    topicName,
    folder,
    pageSize,
  }).then(response => {
    if (response.data !== 1) {
      throw new Error('failed')
    }
  })
}

if (program.publish) {
  const message = program.publish;
  const topic = program.topic;
  return axios.post('http://localhost:3000/publish', { message, topic })
    .then(response => {
      if (response.data !== 1) {
        throw new Error('failed')
      }
    })
}

if (program.get) {
  const id = program.get;
  const topic = program.topic;
  return axios.get(`http://localhost:3000/message/${topic}/${id}`)
    .then(response => {
      console.log(response.data)
    })
}

if (program.delete) {
  
}