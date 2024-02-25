const Koa = require('koa')
const { koaBody } = require('koa-body')
const helmet = require('koa-helmet')
const Router = require('koa-router')
const serve = require('koa-static')
const cors = require('@koa/cors')

const ctrl = require('./controllers')


//const { APP_CONFIG } = require('../pinpictConfig')

const app = new Koa()
const router = new Router()

// Add some security headers
if (process.env.NODE_ENV === 'production') {
  app.use(helmet())
}

if (process.env.NODE_ENV !== 'production') {
  // allow cors for development
  app.use(cors())

  // serve static files for development
  app.use(serve('./src'))
}



app.use(koaBody())


/*
 * Transfers
 *
 */

// List all transfers. TODO: add cursor pagination
router.get('/api/transfers', ctrl.getAllTransfers)

// Create new transfer
router.post('/api/transfers', ctrl.createTransfer)

// Get a specific transfer (with nested recipients)
router.get('/api/transfers/:uuid', ctrl.getTransferDetail)

// Update a transfer
router.put('/api/transfers/:uuid', ctrl.updateTransfer)

// Delete a transfer
router.del('/api/transfers/:uuid', ctrl.deleteTransfer)



/*
 * Recipients
 *
 */


// Create new recipient
router.post('/api/recipients', ctrl.createRecipient)

// Update a recipient
router.put('/api/recipients/:uuid', ctrl.updateRecipient)

// List dropbox content
router.get('/api/listdropbox', ctrl.listDropbox)

// Download (from recipient or transfer uuid) public
router.get('/downloads/:uuid', ctrl.getTransferHtml)

// Stream zip archive (from recipient or transfer uuid) public
router.get('/stream/:uuid', ctrl.streamTransfer)

// Use the routes
app.use(router.routes())

module.exports = app
