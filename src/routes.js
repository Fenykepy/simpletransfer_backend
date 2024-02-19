const Router = require('koa-router')
const db = require('./db')

// prefix all routes with: /api/transfers
const router = new Router({
  prefix: '/api'
})


// Get transfers list TODO add pagination
router.get('/transfers/', async (ctx, next) => {
  try {
    const transfers = await db.getAllTransfers(200)
    ctx.body = transfers
  } catch (error) {
    console.log(error)
    ctx.response.status = 500
    ctx.body = { error: "A server error occured getting transfers" }
  }

  next()
})


// Create a new transfer
router.post('/transfers', async (ctx, next) => {
  try {
    const newTransfer = {} // TODO transfer controller 
    ctx.response.status = 201
    ctx.body = newTransfer
  } catch (error) {
    console.log(error)
    ctx.response.status = 500
    ctx.body = { error: "A server error occured creating transfer" }
  }

  next()
})


// Get a specific transfer with nested recipients
router.get('/transfers/:uuid', async (ctx, next) => {
  try {
    const transfer = await db.getTransferDetail(ctx.params.uuid)
    if (transfer) {
      ctx.body = transfer
    } else {
      ctx.response.status = 404
      ctx.body = { error: 'The transfer you are looking for could not be retrieved.' }
    }
  } catch (error) {
    console.log(error)
    ctx.response.status = 500
    ctx.body = { error: "A server error occured retrieving transfer" }
  }

  next()
})


// Update a specific transfer
router.put('/transfers/:uuid', async (ctx, next) => {
  try {
    const fieldsToUpdate = {} // TODO function to sanitize
    const transfer = await db.updateTransfer(ctx.params.uuid, fieldsToUpdate)
    if (transfer) {
      ctx.body = transfer
    } else {
      ctx.response.status = 404
      ctx.body = { error: 'The transfer you want to update could not be retrieved.' }
    }
  } catch (error) {
    console.log(error)
    ctx.response.status = 500
    ctx.body = { error: "A server error occured updating transfer" }
  }

  next()
})


// Get a specific transfer by uuid, with nested recipients
router.delete('/transfers/:uuid', async (ctx, next) => {
  try {
    const transfer = await db.deleteTransfer(ctx.params.uuid)
    if (transfer) {
      ctx.body = transfer
    } else {
      ctx.response.status = 404
      ctx.body = { error: 'The transfer you want to delete could not be retrieved.' }
    }
  } catch (error) {
    console.log(error)
    ctx.response.status = 500
    ctx.body = { error: "A server error occured deleting transfer" }
  }

  next()
})



module.exports = router
