const fs = require('node:fs/promises')
const path = require('path')

const { APP_CONFIG } = require('../transferConfig')
const db = require('./db')
const val = require('./utils/validate')

// List all transfers
async function getAllTransfers(ctx) {
  ctx.body = await db.getAllTransfers(200)
}

// Create new transfer
async function createTransfer(ctx) {
  // {object: String, message: String, email: String, dropfile: String }
  let errors = []
  let dropfilePath
  if (!val.isValidString(ctx.request.body.object)) { errors.push({ object: "This field is required" }) }
  if (!val.isValidString(ctx.request.body.message)) { errors.push({ message: "This field is required" }) }
  if (!val.isValidEmail(ctx.request.body.email)) { errors.push({ email: "Invalid email" }) }
  if (!val.isValidString(ctx.request.body.dropfile)) { 
    errors.push({ dropfile: "This field is required" })
  } else { // we have a dropfile name, test if path exists
    dropfilePath = path.join(APP_CONFIG.dropboxDirectory, ctx.request.body.dropfile.trim())
    try {
      const stats = await fs.stat(dropfilePath)
    } catch (error) {
      // File doesn't exists
      errors.push({ dropfile: "Invalid dropfile" })
    }
  }

  if (errors.length > 0) {
    ctx.response.status = 422
    ctx.body = { errors: errors }
    return
  }


  // TODO zip dropfile and move it to transfers

  const transfer = {
    email: ctx.request.body.email.trim(),
    object: ctx.request.body.object.trim(),
    message: ctx.request.body.message.trim(),
    original_filename: ctx.request.body.dropfile.trim(),
    archive_filename: '',
  }

  const transfers = await db.createTransfer(transfer)
  ctx.response.status = 201
  ctx.body = transfers[0]
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
  if (!val.isNullOrUndefined(ctx.request.body.email)) {
    if (!val.isValidEmail(ctx.request.body.email)) {
      errors.push({ email: "Invalid email"})
    } else {
      fieldsToUpdate.email = ctx.request.body.email.trim()
    }
  }
  if (!val.isNullOrUndefined(ctx.request.body.active) && isBoolean(ctx.request.body.active)) {
    fieldsToUpdate.active = ctx.request.body.active
  }
  if (Object.keys(fieldsToUpdate).length == 0) { errors.push({ misc: "No valid field to update" }) } 
  if (errors.length > 0) {
    ctx.response.status = 422
    ctx.body = { errors: errors }
    return
  }

  const transfers = await db.updateTransfer(ctx.params.uuid, fieldsToUpdate)
  if (transfer) {
    ctx.body = transfers[0]
  } else {
    ctx.response.status = 404
    ctx.body = { error: 'The transfer you want to update could not be retrieved.' }
  }
} 



// Delete transfer
async function deleteTransfer(ctx) {
  // We should always prefer deactivating a transfer rather than deleting it
  // this way user doesn't see a 404 on transfer's page but a "Deactivated transfer".
  const transfers = await db.deleteTransfer(ctx.params.uuid)
  if (transfer) {
    // TODO delete archive file
    ctx.body = transfers[0]
  } else {
    ctx.response.status = 404
    ctx.body = { error: 'The transfer you want to delete could not be retrieved.' }
  }
}



// Create new recipient
async function createRecipient(ctx) {
  //{ email: String, transfer: UUID, active: Bool}
  let errors = []
  if (!val.isValidEmail(ctx.request.body.email)) { errors.push({ email: "Invalid email" }) }
  const transfer = await db.getTransferDetail(ctx.request.body.transfer, 'pk')
  if (!transfer) { errors.push({ transfer: "Invalid transfer" }) }
  let active = isBoolean(ctx.request.body.active) ? ctx.request.body.active : true // default to true  

  if (errors.length > 0) {
    ctx.response.status = 
    ctx.body = { errors: errors }
    return
  }

  const recipient = {
    email: ctx.request.body.email.trim(),
    transfer: transfer.pk,
    active: active,
  }

  // TODO send mail

  const recipients = await db.createRecipient(recipient)
  ctx.response.status = 201
  ctx.body = recipients[0]
}



// Update recipient
async function updateRecipient(ctx) {
  // We can't change email because it was already send, so only updatable field is active
  let fields
  if (!isBoolean(ctx.request.body.active)) {
    ctx.response.status = 422
    ctx.body = { errors: { active: "Invalid value" }}
    return
  }
  const recipients = await db.updateRecipient(ctx.params.uuid, { active: ctx.request.body.active })
  if (recipient) {
    ctx.body = recipient[0]
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



