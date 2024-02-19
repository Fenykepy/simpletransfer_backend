
require('dotenv').config()
const path = require('path')

const BASE_PATH = path.join(__dirname, 'src', 'db')

const {
  DB_FILE,
  NODE_ENV,
} = process.env

module.exports = {
  client: 'sqlite3',
  connection: {
    filename: DB_FILE,
  },
  useNullAsDefault: true, // necessary for sqlite
  migrations: {
    directory: path.join(BASE_PATH, 'migrations'),
  },
  seeds: {
    directory: path.join(BASE_PATH, 'seeds'),
  },
  debug: NODE_ENV !== 'production'
}
