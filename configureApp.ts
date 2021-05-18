const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')

const configureApp = () => {
  const app = express()
  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: true }))
  // parse application/json
  app.use(bodyParser.json())

  return app
}

export default configureApp