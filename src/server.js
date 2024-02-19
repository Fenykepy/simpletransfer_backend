const Koa = require('koa')
const { koaBody } = require('koa-body')


//const { APP_CONFIG } = require('../pinpictConfig')

const app = new Koa()

app.use(koaBody())

// routes
let routes = require('./routes')

// Use the routes
app.use(routes.routes())

module.exports = app
