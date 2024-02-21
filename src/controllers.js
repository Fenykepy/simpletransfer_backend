const fs = require('node:fs/promises')
const path = require('path')
const AdmZip = require("adm-zip")
const { v4: uuidv4 } = require('uuid')

const { APP_CONFIG } = require('../transferConfig')
const db = require('./db')
const val = require('./utils/validate')
const filesystem = require('./utils/filesystem')

// List all transfers
async function getAllTransfers(ctx) {
  ctx.body = await db.getAllTransfers(200)
}

// Create new transfer
async function createTransfer(ctx) {
  // {object: String, message: String, email: String, dropfile: String }
  let errors = []
  let dropfilePath
  let stats
  if (!val.isValidString(ctx.request.body.object)) { errors.push({ object: "This field is required" }) }
  if (!val.isValidString(ctx.request.body.message)) { errors.push({ message: "This field is required" }) }
  if (!val.isValidEmail(ctx.request.body.email)) { errors.push({ email: "Invalid email" }) }
  if (!val.isValidString(ctx.request.body.dropfile)) { 
    errors.push({ dropfile: "This field is required" })
  } else { // we have a dropfile name, test if path exists
    dropfilePath = path.join(APP_CONFIG.dropboxDirectory, ctx.request.body.dropfile.trim())
    try {
      stats = await fs.stat(dropfilePath)
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

  const date = new Date()
  const uuid = uuidv4()
  const zipName = `${date.toISOString()}_${uuid}.zip`
  const zipPath = path.join(APP_CONFIG.transfersDirectory, zipName)
  
  
  // zip dropfile and move it to transfers
  let zip = new AdmZip()
  if (stats.isFile()) {
    zip.addLocalFile(dropfilePath)
  } else if (stats.isDirectory()) {
    zip.addLocalFolder(dropfilePath)
  }
  zip.writeZip(zipPath)

  // We don't catch because it shouldn't fail without server error
  const zipStats = await fs.stat(zipPath)


  const transfer = {
    uuid: uuid,
    email: ctx.request.body.email.trim(),
    object: ctx.request.body.object.trim(),
    message: ctx.request.body.message.trim(),
    original_filename: ctx.request.body.dropfile.trim(),
    archive_filename: zipName,
    archive_size: zipStats.size,
  }

  const transfers = await db.createTransfer(transfer)
  ctx.response.status = 201
  ctx.body = transfers[0]
}



// Get transfer detail
async function getTransferDetail(ctx) {
  const transfer = await db.getTransferDetail(ctx.params.uuid)
  let errors = []
  if (transfer) {
    ctx.body = transfer
  } else {
      ctx.response.status = 404
      errors.push({ non_field_errors: "The transfer you are looking for could not be retrieved." })
      ctx.body = { errors: errors }
  }
}


// Update transfer
async function updateTransfer(ctx) {
  // We can't update object and message because they were already sent by email to recipients
  // We can update email and active status
  let errors = []
  
  // Check if transfer exists
  const transfer = await db.getTransferByUUID(ctx.params.uuid, 'pk')
  if (!transfer) {
    ctx.response.status = 404
    errors.push({ non_field_errors: "The transfer you want to update could not be retrieved." })
    ctx.body = { errors: errors }
    return
  }

  let fieldsToUpdate = {}
  if (!val.isNullOrUndefined(ctx.request.body.email)) {
    if (!val.isValidEmail(ctx.request.body.email)) {
      errors.push({ email: "Invalid email"})
    } else {
      fieldsToUpdate.email = ctx.request.body.email.trim()
    }
  }
  if (!val.isNullOrUndefined(ctx.request.body.active)) {
    if (!val.isBoolean(ctx.request.body.active)) {
      errors.push({ active: "Invalid boolean"})
    } else {
      fieldsToUpdate.active = ctx.request.body.active
    }
  }
  if (Object.keys(fieldsToUpdate).length == 0) { errors.push({ non_field_errors: "No valid field to update" }) } 
  if (errors.length > 0) {
    ctx.response.status = 422
    ctx.body = { errors: errors }
    return
  }

  const transfers = await db.updateTransfer(ctx.params.uuid, fieldsToUpdate)
  ctx.body = transfers[0]
} 



// Delete transfer
async function deleteTransfer(ctx) {
  // We should always prefer deactivating a transfer rather than deleting it
  // this way user doesn't see a 404 on transfer's page but a "Deactivated transfer".
  let errors = []

  // Check if transfer exists
  const transfer = await db.getTransferByUUID(ctx.params.uuid, '*')
  if (!transfer) {
    ctx.response.status = 404
    errors.push({ non_field_errors: 'The transfer you want to delete could not be retrieved.' })
    ctx.body = { errors: errors }
    return
  }

  // Delete archive file
  let zipPath = path.join(APP_CONFIG.transfersDirectory, transfer.archive_filename)
  if (await filesystem.fileExists(zipPath)) {
    await fs.rm(zipPath)
  }

  // Returning doesn't work with sqlite3 and delete method
  await db.deleteTransfer(ctx.params.uuid)
  
  ctx.body = transfer
}



// Create new recipient
async function createRecipient(ctx) {
  //{ email: String, transfer: UUID}
  let errors = []
  if (!val.isValidEmail(ctx.request.body.email)) { errors.push({ email: "Invalid email" }) }
  const transfer = await db.getTransferDetail(ctx.request.body.transfer, 'pk')
  if (!transfer) { errors.push({ transfer: "Invalid transfer UUID" }) }

  if (errors.length > 0) {
    ctx.response.status = 422
    ctx.body = { errors: errors }
    return
  }

  const recipient = {
    email: ctx.request.body.email.trim(),
    transfer: transfer.pk,
  }

  // TODO send mail if active

  const recipients = await db.createRecipient(recipient)
  ctx.response.status = 201
  ctx.body = recipients[0]
}



// Update recipient
async function updateRecipient(ctx) {
  // We can't change email because it was already send, so only updatable field is active
  let errors = []

  // Check if recipient exists
  const recipient = await db.getRecipientByUUID(ctx.params.uuid, 'pk')
  if (!recipient) {
    ctx.response.status = 404
    errors.push({ non_field_errors: 'The recipient you want to update could not be retrieved.' })
    ctx.body = { errors: errors }
    return
  }
  if (!val.isBoolean(ctx.request.body.active)) {
    ctx.response.status = 422
    errors.push({ active: "Invalid value" })
    ctx.body = { errors: errors }
    return
  }
  const recipients = await db.updateRecipient(ctx.params.uuid, { active: ctx.request.body.active })
  ctx.body = recipients[0]
}



// We don't delete recipents, they are deleted with the transfer



// List dropbox content
async function listDropbox(ctx) {
  const content = await fs.readdir(APP_CONFIG.dropboxDirectory, { withFileTypes: true })
  let results = []
  for (let dirent of content) {
    if (dirent.isDirectory()) {
      results.push({ name: dirent.name, isDirectory: true })
    } else if (dirent.isFile()) {
      results.push({ name: dirent.name, isDirectory: false })
    }
  }
  ctx.body = results
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



