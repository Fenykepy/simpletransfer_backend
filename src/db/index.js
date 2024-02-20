const db = require('./connection')

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

  /* Return a specific tranfer with associated recipients */
  getTransferDetail(transferUUID, fields = '*') { // fields must be prefixed with table name
    return db('transfers')
      .where({ 'transfer.uuid': transferUUID })
      .first()
      .innerJoin('recipients', 'recipients.transfer', 'transfers.pk')
      .select(fields)
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
      .returning('*')
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
