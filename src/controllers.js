const db = require('./db')
const { v4: uuidv4 } = require('uuid')
const val = require('./utils/validate')

// List all transfers
async function getAllTransfers(ctx) {
  ctx.body = await db.getAllTransfers(200)
}

// Create new transfer
async function createTransfer(ctx) {
  // {object: String, message: String, email: String, dropfile: String }
  let errors = []
  if (!val.isNotEmptyString(ctx.body.object)) { errors.push({ object: "This field is required" }) }
  if (!val.isNotEmptyString(ctx.body.message)) { errors.push({ message: "This field is required" }) }
  if (!val.isNotEmptyString(ctx.body.dropfile)) { errors.push({ dropfile: "This field is required" }) }
  if (!val.isValidEmail(ctx.body.email)) { errors.push({ email: "Invalid email" }) }

  // TODO test if dropfile correspond to a real file or directory in the dropbox
  
  if (errors.length > 0) {
    ctx.response.status = 422
    ctx.body = { errors: errors }
    return
  }


  // TODO zip dropfile and move it to transfers

  const transfer = {
    uuid: uuidv4(),
    email: ctx.body.email.trim(),
    object: ctx.body.object.trim(),
    message: ctx.body.message.trim(),
    original_filename: ctx.body.dropfile.trim(),
    archive_filename: '',
  }

  const newTransfer = await db.createTransfer(transfer)
  ctx.response.status = 201
  ctx.body = newTransfer
}



// Get transfer detail
async function getTransferDetail(ctx) {
  const transfer = await db.getTransferDetail(ctx.params.uuid)
  if (transfer) {
    ctx.body = transfer
  } else {
      ctx.response.status = 404
      ctx.body = { error: 'The transfer you are looking for could not be retrieved.' }
  }
}


// Update transfer
async function updateTransfer(ctx) {
  // We can't update object and message because they were already sent by email to recipients
  // We can update email and active status
  let errors = []
  let fieldsToUpdate = {}
  if (!val.isNullOrUndefined(ctx.body.email)) {
    if (!val.isValidEmail(ctx.body.email)) {
      errors.push({ email: "Invalid email"})
    } else {
      fieldsToUpdate.email = ctx.body.email.trim()
    }
  }
  if (!val.isNullOrUndefined(ctx.body.active) && isBoolean(ctx.body.active)) {
    fieldsToUpdate.active = ctx.body.active
  }
  if (Object.keys(fieldsToUpdate).length == 0) { errors.push({ misc: "No valid field to update" }) } 
  if (errors.length > 0) {
    ctx.response.status = 422
    ctx.body = { errors: errors }
    return
  }

  const transfer = await db.updateTransfer(ctx.params.uuid, fieldsToUpdate)
  if (transfer) {
    ctx.body = transfer
  } else {
    ctx.response.status = 404
    ctx.body = { error: 'The transfer you want to update could not be retrieved.' }
  }
} 



// Delete transfer
async function deleteTransfer(ctx) {
  // We should always prefer deactivating a transfer rather than deleting it
  // this way user doesn't see a 404 on transfer's page but a "Deactivated transfer".
  const transfer = await db.deleteTransfer(ctx.params.uuid)
  if (transfer) {
    // TODO delete archive file
    ctx.body = transfer
  } else {
    ctx.response.status = 404
    ctx.body = { error: 'The transfer you want to delete could not be retrieved.' }
  }
}



// Create new recipient
async function createRecipient(ctx) {
  //{ email: String, transfer: UUID, active: Bool}
  let errors = []
  if (!val.isValidEmail(ctx.body.email)) { errors.push({ email: "Invalid email" }) }
  const transfer = await db.getTransferDetail(ctx.body.transfer, 'pk')
  if (!transfer) { errors.push({ transfer: "Invalid transfer" }) }
  let active = isBoolean(ctx.body.active) ? ctx.body.active : true // default to true  

  if (errors.length > 0) {
    ctx.response.status = 
    ctx.body = { errors: errors }
    return
  }

  const recipient = {
    uuid: uuidv4(),
    email: ctx.body.email.trim(),
    transfer: transfer.pk,
    active: active,
  }

  // TODO send mail

  const newRecipient = await db.createRecipient(recipient)
  ctx.response.status = 201
  ctx.body = newTransfer
}



// Update recipient
async function updateRecipient(ctx) {
  // We can't change email because it was already send, so only updatable field is active
  let fields
  if (!isBoolean(ctx.body.active)) {
    ctx.response.status = 422
    ctx.body = { errors: { active: "Invalid value" }}
    return
  }
  const recipient = await db.updateRecipient(ctx.params.uuid, { active: ctx.body.active })
  if (recipient) {
    ctx.body = recipient
  } else {
    ctx.response.status = 404
    ctx.body = { error: 'The recipient you want to update could not be retrieved.' }
  }
}



// We don't delete recipents, they are deleted with the transfer



// List dropbox content
async function listDropbox(ctx) {
  console.log('List dropbox')
}


module.exports = {
  getAllTransfers,
  createTransfer,
  getTransferDetail,
  updateTransfer,
  deleteTransfer,
  createRecipient,
  updateRecipient,
  listDropbox,
}



