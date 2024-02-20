const db = require('./connection')

function addFieldToSelection(field, selection) {
  if (selection = '*') { return selection } // all fields already included, nothing to do
  if (Array.isArray(selection)) { // We got an array on fields
    if (selection.contains(field)) { // field already included, nothing to do
      return selection
    } else { // return new array with field included
      let newFields = selection.slice()
      newFields.push(field)
      return newFields
    }
  }
  // if we are here, selection is a string (only field)
  if (selection === field) { return selection } // selection is field, nothing to do
  return [field, selection] // return an array with field added
}


module.exports = {
  /* Return all transfers (paginated with pk as cursor) */
  getAllTransfers(limit, cursor, fields = '*', before = false) {
    const order = before ? 'asc' : 'desc'
    const comparator = before ? '>' : '<'
    const query = db('transfers')
      .select(fields)
      .orderBy('transfers.pk', order)
      .limit(limit)
    if (cursor) {
      query.where('transfer.pk', comparator, cursor)
    }

    return query
  },

  /* Return a specific transfer without recipients */
  getTransferByUUID(transferUUID, fields = '*') {
    return db('transfers')
      .where({ uuid: transferUUID })
      .first()
      .select(fields)
  },

  /* Return a specific tranfer with associated recipients */
  async getTransferDetail(transferUUID, transferFields = '*', recipientFields = '*') {
    const fields = addFieldToSelection('pk', transferFields)
    const transfer = await db('transfers')
      .where({ uuid: transferUUID })
      .first()
      .select(fields)
    const recipients = await db('recipients')
      .where({ transfer: transfer.pk })
      .select(recipientFields)
      .orderBy('email', 'asc')
    transfer.recipients = recipients

    return transfer
  },


  /* Create a transfer and returns it */
  createTransfer(transfer) {
    return db('transfers')
      .insert(transfer)
      .returning('*')
  },


  /* Update a transfer and returns it */
  updateTransfer(transferUUID, fieldsToUpdate) {
    return db('transfers')
      .where({ uuid: transferUUID })
      .update({
        updated_at: db.fn.now(),
        ...fieldsToUpdate
      })
      .returning('*')
  },


  /* Delete a transfer */
  deleteTransfer(transferUUID) {
    return db('transfers')
      .where({ uuid: transferUUID })
      .del()
      .returning('*') // doesn't seem to work with better-sqlite3, however it works in update method.
  },


  /* Create a recipient and returns it */
  createRecipient(recipient) {
    return db('recipients')
      .insert(recipient)
      .returning('*')
  },


  /* Update a recipient and returns it */
  updateRecipient(recipientUUID, fieldsToUpdate) {
    return db('recipients')
      .where({ uuid: recipientUUID })
      .update({
        updated_a: db.fn.now(),
        ...fieldsToUpdate
      })
      .returning('*')
  },


  /* Delete a recipient */
  deleteRecipient(recipientUUID) {
    return db('recipients')
      .where({ uuid: recipientUUID })
      .del()
      .returning('*')
  }
}
