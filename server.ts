import { TopicMeta } from "./topic_cache";

export {};

import configureApp from './configureApp'
import * as fs from 'fs'

import { pageFile, pageMap } from './templates/page'
import { mapEntry } from './templates/map'
import { flushData, readChunk } from './store'
import { metaFileName, newDatabase } from './templates/newDB'
import { topicCache } from './topic_cache'
import { prefixMap } from './prefixMap';

const app = configureApp();
const port = process.env.PORT || 3000

const TOPIC_CACHE = topicCache();

interface LogRecord {
  index: number;
  message: string;
}

const getTopicMeta: (topicName: string) => TopicMeta = topicName => {
  if(TOPIC_CACHE[topicName]){
    return TOPIC_CACHE[topicName].topicMeta;
  } else {
    const metaBuffer = fs.readFileSync(metaFileName(topicName)).toString()
    const metaData = JSON.parse(metaBuffer)
    TOPIC_CACHE[topicName] = { topicMeta: metaData }
    return metaData;
  }
}

const writePageFiles = (folder: string, index: number) => {
  fs.writeFileSync(`./data/${folder}/${pageFile(index)}`, '')
  fs.writeFileSync(`./data/${folder}/${pageMap(index)}`, '{}')
}

const writePrefixMap = (folder: string, map) => {
  fs.writeFileSync(`./data/${folder}/prefixMap.json`, JSON.stringify(map))
}

const getPrefixMap = (folder: string) => {
  const file = fs.readFileSync(`./data/${folder}/prefixMap.json`).toString();
  return JSON.parse(file)
}

const writeDataToLog = (data: string, topicMeta: TopicMeta, pageIndex: number) => {
  flushData(getPageFileName(topicMeta, pageIndex), data, () => {
    console.log('wrote data to log')
  })
}

const persistTopicMeta = (topicMeta: TopicMeta) => {
  fs.writeFileSync(metaFileName(topicMeta.name), JSON.stringify(topicMeta), { flag: 'w' })
}

const persistMap = (mapFileName: string, map) => {
  fs.writeFileSync(mapFileName, JSON.stringify(map), { flag: 'w' })
}

const encodeMessage = msg => msg;
const decodeMessage = msg => msg;

const getPageFileName = (topicMeta, index) => `./data/${topicMeta.folder}/` + pageFile(index);
const getMapFileName = (topicMeta, index) => `./data/${topicMeta.folder}/`+ pageMap(index);
const getParsedMap = (topicName, mapFileName, options={}) => {
  // getTopicMeta should always be called before this to initialize the current cache
  if (TOPIC_CACHE[topicName][mapFileName]){
    return TOPIC_CACHE[topicName][mapFileName]
  } else {
    let map;
    try {
      map = JSON.parse(fs.readFileSync(mapFileName).toString());
    } catch(e){
      map = {}
    }
    // if we get here we know that the map file is for the next page
    TOPIC_CACHE[topicName][mapFileName] = map;
    return map;
  }
}

const getMessageindex = (topicMeta, map, message) => {
  const index = topicMeta.lastIndex + 1;
  let start, end;
  if (index === 0 || (index % topicMeta.pageSize) === 0) {
    start = 0
  } else {
    start = map[index-1].end
  }
  end = start + message.length;
  return { start, end, index }
}

const scanPage = (pageIndex: number, map, page: string, topicMeta: TopicMeta, regex?: string) => {
  let currentIndex = pageIndex * topicMeta.pageSize
  let end = currentIndex + (topicMeta.pageSize - 1);
  if (pageIndex === topicMeta.activePage) {
    end = topicMeta.lastIndex;
  }
  let expression = regex ? new RegExp(regex) : null;
  const result: LogRecord[] = []
  while(currentIndex <= end){
    const messageSpan = map[currentIndex]
    console.log(messageSpan)
    const message = page.substring(messageSpan.start, messageSpan.end)
    if (!expression || (expression && expression.test(message))) {
      result.push({ index: currentIndex, message })
    }
    currentIndex += 1;
  }
  return result;
}

const getById = (topicMeta: TopicMeta, id: number) => {
  const pageIndex = Math.floor(id / topicMeta.pageSize)
  const pageFileName = getPageFileName(topicMeta, pageIndex)
  const mapFileName = getMapFileName(topicMeta, pageIndex)
  const map = getParsedMap(topicMeta.name, mapFileName)
  const { start, end } = map[id];
  // const page = fs.readFileSync(pageFileName).toString()
  return readChunk(pageFileName, start, end)
}

app.post('/publish', (req, res) => {
  const topic = req.body.topic;
  const message = encodeMessage(req.body.message)
  const topicMeta = getTopicMeta(topic)
  const pageIndex = Math.floor((topicMeta.lastIndex + 1) / topicMeta.pageSize)
  const pageFileName = getPageFileName(topicMeta, pageIndex)
  const mapFileName = getMapFileName(topicMeta, pageIndex)
  const map = getParsedMap(topic, mapFileName, { create: true})

  const { start, end, index } = getMessageindex(topicMeta, map, message)

  map[index] = mapEntry(start, end)
  topicMeta.lastIndex = index
  topicMeta.activePage = pageIndex
  writeDataToLog(message, topicMeta, pageIndex)
  persistTopicMeta(topicMeta)
  persistMap(mapFileName, map)
  res.end(JSON.stringify(1))
})

app.get('/message/:topic/:id', (req, res) => {
  const { topic, id } = req.params;
  const topicMeta = getTopicMeta(topic)
  const message = getById(topicMeta, id)

  res.end(JSON.stringify(message.toString()))
})

app.post('/new-topic', (req, res) => {
  const { topicName, pageSize, folder } = req.body;
  fs.mkdirSync(`./data/${folder}`);
  writePageFiles(folder, 0)
  fs.writeFileSync(metaFileName(topicName), newDatabase(topicName, pageSize, folder))
  res.end(JSON.stringify(1))
})

app.get('/filter/:topic', (req, res) => {
  const { topic } = req.params;
  const { regex } = req.query
  const topicMeta = getTopicMeta(topic)
  let result = []
  for(let i = 0; i <= topicMeta.activePage; i++){
    const mapFileName = getMapFileName(topicMeta, i)
    const pageFileName = getPageFileName(topicMeta, i)
    const map = getParsedMap(topic, mapFileName)
    const page = fs.readFileSync(pageFileName).toString()
    const pageResult = scanPage(i, map, page, topicMeta, regex)
    result = result.concat(pageResult)
  }
  res.end(JSON.stringify(result))
})

app.get('/prefix/:topic', (req, res) => {
  const { topic } = req.params;
  const topicMeta = getTopicMeta(topic)
  let result = {}
  for(let i = 0; i <= topicMeta.activePage; i++){
    const mapFileName = getMapFileName(topicMeta, i)
    const pageFileName = getPageFileName(topicMeta, i)
    const map = getParsedMap(topic, mapFileName)
    const page = fs.readFileSync(pageFileName).toString()
    const pageResult = scanPage(i, map, page, topicMeta)
    prefixMap(pageResult, result)
  }
  writePrefixMap(topicMeta.folder, result)
  res.end(JSON.stringify(result));
})

app.get('/prefix/:topic/:chunk', (req, res) => {
  const { topic, chunk } = req.params;
  console.log(chunk)
  const topicMeta = getTopicMeta(topic)
  const map = getPrefixMap(topicMeta.folder)
  const ids = map[chunk]
  const messages = ids.map(id => getById(topicMeta, id).toString())
  res.end(JSON.stringify(messages))
})

app.get('/delete/:topic', (req, res) => {

})

app.listen(port, () => {
  console.log(`NogDB listening on http://localhost:${port}`)
})