const configureApp = require('./configureApp')
const fs = require('fs')

const { pageFile, pageMap } = require('./templates/page')
const { mapEntry } = require('./templates/map')
const { flushData, readChunk } = require('./store')
const { metaFileName, newDatabase } = require('./templates/newDB')

const app = configureApp();
const port = process.env.PORT || 3000

const TOPIC_CACHE = {};
const getTopicMeta = topicName => {
  if(TOPIC_CACHE[topicName]){
    return TOPIC_CACHE[topicName];
  } else {
    const metaBuffer = fs.readFileSync(metaFileName(topicName)).toString()
    const metaData = JSON.parse(metaBuffer.toString())
    TOPIC_CACHE[topicName] = metaData
    return metaData;
  }
}

const writePageFiles = (folder, index) => {
  fs.writeFileSync(`./data/${folder}/${pageFile(index)}`, '')
  fs.writeFileSync(`./data/${folder}/${pageMap(index)}`, '{}')
}

const managePages = topicMeta => {
  const nextPage = Math.floor((topicMeta.lastIndex + 1) / topicMeta.pageSize)
  if (nextPage !== topicMeta.activePage) {
    writePageFiles(topicMeta.folder, nextPage)
    topicMeta.activePage = nextPage
  }
}

const writeTopicMeta = topicMeta => {
  fs.writeFileSync(metaFileName(topicMeta.name), JSON.stringify(topicMeta), { flags: 'w' })
}

const encodeMessage = msg => msg;
const decodeMessage = msg => msg;

const getPageFileName = (topicMeta, index) => `./data/${topicMeta.folder}/` + pageFile(index);
const getMapFileName = (topicMeta, index) => `./data/${topicMeta.folder}/`+ pageMap(index);

app.post('/publish', (req, res) => {
  const topic = req.body.topic;
  const message = encodeMessage(req.body.message)
  const topicMeta = getTopicMeta(topic)
  const pageFileName = getPageFileName(topicMeta, topicMeta.activePage)
  const mapFileName = getMapFileName(topicMeta, topicMeta.activePage)
  const map = JSON.parse(fs.readFileSync(mapFileName).toString());

  const index = topicMeta.lastIndex + 1;
  let start, end;
  if (index === 1 || (index % topicMeta.pageSize) === 0) {
    start = 0
  } else {
    start = map[index-1].end
  }
  end = start + message.length;

  flushData(pageFileName, message, () => {
    map[index] = mapEntry(start, end)
    fs.writeFileSync(mapFileName, JSON.stringify(map), { flags: 'w' })
    topicMeta.lastIndex = index
    managePages(topicMeta)
    writeTopicMeta(topicMeta)
    res.end(JSON.stringify(1))
  })
})

app.get('/message/:topic/:id', (req, res) => {
  const { topic, id } = req.params;
  const topicMeta = getTopicMeta(topic)
  const index = Math.floor(id / topicMeta.pageSize)
  const pageFileName = getPageFileName(topicMeta, index)
  const mapFileName = getMapFileName(topicMeta, index)
  const map = JSON.parse(fs.readFileSync(mapFileName).toString());
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

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})