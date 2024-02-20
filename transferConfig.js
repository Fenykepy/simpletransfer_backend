const dotenv = require('dotenv')
const path = require('path')

dotenv.config()

const {
  NODE_ENV,
  PORT,
  TRANSFERS_DIRECTORY,
  DROPBOX_DIRECTORY,
} = process.env

exports.APP_CONFIG = {
  /*
   * Port application will listen at. Default: 4000
   * can also be a path to a socket file: '/tmp/pinpict.sock'
   * (it should be set in .env file)
   */
  port: PORT,
  /*
   * Transfer directory (where all archives to be transfered are stored).
   * must be a full path to the directory (from root)
   * (without trailing '/')
   */
  transfersDirectory: TRANSFERS_DIRECTORY,
  /*
   * Dropbox directory (where user drop files to be transfered).
   * must be a full path to the directory (from root)
   * (without trailing '/')
   */
  dropboxDirectory: DROPBOX_DIRECTORY,
}

  
