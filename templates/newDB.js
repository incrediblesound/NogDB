const newDatabase = (name, pageSize, folder) => (
`{
  "name": "${name}",
  "activePage": 0,
  "lastIndex": 0,
  "pageSize": ${pageSize},
  "folder": "${folder}"
}
`)

const metaFileName = name => `./data/${name}_meta.json`

module.exports = {
  newDatabase,
  metaFileName,
}