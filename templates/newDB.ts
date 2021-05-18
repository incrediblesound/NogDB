export const newDatabase = (name: string, pageSize: number, folder: string) => (
`{
  "name": "${name}",
  "activePage": 0,
  "lastIndex": -1,
  "pageSize": ${pageSize},
  "folder": "${folder}"
}
`)

export const metaFileName = (name: string) => `./data/${name}_meta.json`
