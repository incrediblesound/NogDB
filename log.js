const fs = require('fs');
const axios = require('axios');

const { Command } = require('commander');
const { buildMap } = require('./prefixMap.js');
const program = new Command();
program.version('0.0.1');

program
  .option('-n, --new-topic <name>', 'create a new topic')
  .option('-f, --folder <path>', 'set folder for data')
  .option('-g, --get <id>', 'get a message by id')
  .option('-p, --publish <message>', 'send a message')
  .option('-r, --regex <regex>', 'filter with regex')
  .option('-s, --page-size <size>', 'set page size')
  .option('-t, --topic <name>', 'specify the topic')
  .option('-D, --delete <name>', 'delete a topic')
  .option('-pr --prefix', 'add a prefix index')
  .option('-gp --get-prefix <prefix>', 'get by a prefix')

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
  if (!topic) {
    throw new Error('must specify topic with -t')
  }
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

if (program.regex) {
  const topic = program.topic;
  const regex = program.regex;
  return axios.get(`http://localhost:3000/filter/${topic}?regex=${regex}`)
    .then(response => {
      console.log(response.data)
      const words = response.data.map(entry => entry.message)
      console.log(buildMap(words))
    })
}

if (program.delete) {
  const topic = program.delete;
  return axios.get(`http://localhost:3000/delete/${topic}`)
  .then(response => {
    console.log(response.data)
  })
}

if (program.prefix) {
  const topic = program.topic;
  return axios.get(`http://localhost:3000/prefix/${topic}`)
  .then(response => {
    console.log(response.data)
  })
}

if (program.getPrefix) {
  const topic = program.topic
  const prefix = program.getPrefix
  return axios.get(`http://localhost:3000/prefix/${topic}/${prefix}`)
  .then(response => {
    console.log(response.data)
  })
}