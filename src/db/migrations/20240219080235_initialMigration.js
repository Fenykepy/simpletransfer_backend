/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {

  // Create table for transfers
  await knex.schema.createTable('transfers', table => {
    // Database primary key
    table.increments('pk')
    // User side unique identifier
    table.uuid('uuid').defaultTo(knex.fn.uuid())
    // Transfer creation date (auto)
    table.timestamp('created_at').defaultTo(knex.fn.now())
    // Transfer last update date (manual)
    table.timestamp('updated_at')
    // Transfer sender email
    table.string('email')
    // Transfer archive file name
    table.string('archive_filename')
    table.string('original_filename')
    table.string('object')
    table.string('message')
    table.boolean('complete').defaultTo(false) // true when all recipients have downloaded
    table.boolean('active').defaultTo(true) // false is recipient is no more allowed to download
    table.unique('uuid')
    table.index('uuid')
  })
  

  // Create table for recipients
  await knex.schema.createTable('recipients', table => {
    // Database primary key
    table.increments('pk')
    // User side unique identifier
    table.uuid('uuid').defaultTo(knex.fn.uuid())
    // Recipient creation date (auto)
    table.timestamp('created_at').defaultTo(knex.fn.now())
    // Recipient last update date (manual)
    table.timestamp('updated_at')
    // Recipient mail
    table.string('email')
    // Recipient transfer
    table.integer('transfer')
      .references('pk')
      .inTable('transfers')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
    // UUID for unique url identifier
    table.boolean('complete').defaultTo(false) // true when downloaded
    table.boolean('active').defaultTo(true) // false if recipient is no more allowed to download
    table.string('download_dates') // coma separated list of downloads dates
    table.unique('uuid')
    table.index('uuid')
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTable('recipients')
  await knex.schema.dropTable('transfers')
}
