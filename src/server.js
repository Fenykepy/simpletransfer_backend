const Koa = require('koa')
const { koaBody } = require('koa-body')


//const { APP_CONFIG } = require('../pinpictConfig')

const app = new Koa()

app.use(koaBody())

// Require transfers routes
let transfers = require('./transfers')

// Use the routes
app.use(transfers.routes())

module.exports = app
