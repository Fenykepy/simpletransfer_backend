const Router = require('koa-router')

// prefix all routes with: /api/transfers
const router = new Router({
  prefix: '/api/transfers'
})


// fake data
let transfers = [
  {id: 1, name: "test"},
  {id: 2, name: "status"},
  {id: 3, name: "table"},
]


router.get('/', (ctx, next) => {
  ctx.body = transfers
  next()
})

router.get('/:id', (ctx, next) => {
  let getRequestedTransfer = transfers.filter(transfer => {
    if (transfer.id == ctx.params.id) { return true }
  })

  if (getRequestedTransfer.length) {
    ctx.body = getRequestedTransfer[0]
  } else {
    ctx.response.status = 404
    ctx.body = 'Transfer not found'
  }

  next()
})


router.post('/', (ctx, next) => {
  if (!ctx.request.body.id || !ctx.request.body.name) {
    ctx.response.status = 400
    ctx.body = 'Please enter valid data'
  } else {
    let newTransfer = { id: ctx.request.body.id, name: ctx.request.body.name }
    transfers.push(newTransfer)
    ctx.response.status = 201
    ctx.body = newTransfer
  }
  next()
})



module.exports = router
