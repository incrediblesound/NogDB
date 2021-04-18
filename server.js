const configureApp = require('./configureApp')
const fs = require('fs')

const { pageFile, pageMap } = require('./templates/page')
const { mapEntry } = require('./templates/map')
const { flushData } = require('./store')
const { metaFileName, newDatabase } = require('./templates/newDB')

const app = configureApp();
const port = process.env.PORT || 3000

const TOPIC_CACHE = {};

const getTopicMeta = topicName => {
  if(TOPIC_CACHE[topicName]){
    return TOPIC_CACHE[topicName].topicMeta;
  } else {
    const metaBuffer = fs.readFileSync(metaFileName(topicName)).toString()
    const metaData = JSON.parse(metaBuffer)
    TOPIC_CACHE[topicName] = {
      writeBuffer: '',
    }
    TOPIC_CACHE[topicName].topicMeta = metaData
    return metaData;
  }
}

// const writeToBuffer = (topicMeta, message) => {
//   let writeBuffer = TOPIC_CACHE[topicMeta.name].writeBuffer;
//   writeBuffer += message;
// }

// const flushWriteCache = (topicMeta, cb) => {
//   const writeBuffer = TOPIC_CACHE[topicMeta.name].writeBuffer;
//   const pageFileName = getPageFileName(topicMeta, topicMeta.activePage)
//   flushData(pageFileName, writeBuffer, () => {
//     TOPIC_CACHE[topicMeta.name].writeBuffer = '';
//     cb()
//   })
// }

const writePageFiles = (folder, index) => {
  fs.writeFileSync(`./data/${folder}/${pageFile(index)}`, '')
  fs.writeFileSync(`./data/${folder}/${pageMap(index)}`, '{}')
}

const writeDataToLog = (data, topicMeta, pageIndex) => {
  flushData(getPageFileName(topicMeta, pageIndex), data, () => {
    console.log('wrote data to log')
  })
}

// const managePages = (topicMeta, cb) => {
//   const nextPage = Math.floor((topicMeta.lastIndex + 1) / topicMeta.pageSize)
//   if (nextPage !== topicMeta.activePage) {
//     flushWriteCache(topicMeta, () => {
//       writePageFiles(topicMeta.folder, nextPage)
//       topicMeta.activePage = nextPage
//       cb(true)
//     })
//   }
//   cb(false)
// }

const persistTopicMeta = topicMeta => {
  fs.writeFileSync(metaFileName(topicMeta.name), JSON.stringify(topicMeta), { flags: 'w' })
}

const persistMap = (mapFileName, map) => {
  fs.writeFileSync(mapFileName, JSON.stringify(map), { flags: 'w' })
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

const scanPage = (pageIndex, map, page, topicMeta, regex) => {
  let currentIndex = pageIndex * topicMeta.pageSize
  let end = currentIndex + topicMeta.pageSize;
  if (pageIndex === topicMeta.activePage) {
    end = topicMeta.lastIndex;
  }
  let expression = regex ? new RegExp(regex) : null;
  const result = []
  while(currentIndex < (end-1)){
    const messageSpan = map[currentIndex]
    const message = page.substring(messageSpan.start, messageSpan.end)
    if (!expression || (expression && expression.test(message))) {
      result.push({ index: currentIndex, message })
    }
    currentIndex += 1;
  }
  return result;
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
  const pageIndex = Math.floor(id / topicMeta.pageSize)
  const pageFileName = getPageFileName(topicMeta, pageIndex)
  const mapFileName = getMapFileName(topicMeta, pageIndex)
  const map = getParsedMap(topic, mapFileName)
  const { start, end } = map[id];
  const page = fs.readFileSync(pageFileName).toString()
  const message = page.substring(start, end)
  res.end(JSON.stringify(message))
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

app.get('/delete/:topic', (req, res) => {

})

app.listen(port, () => {
  console.log(`NogDB listening on http://localhost:${port}`)
})