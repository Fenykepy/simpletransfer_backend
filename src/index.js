const { APP_CONFIG } = require('../transferConfig')
const app = require('./server')
const fs = require('fs')

const PORT = APP_CONFIG.port || 4000


function resetSocket(sock) {
  /*
   * We first delete socket if file exists,
   * as it's not automatically done at shutdown,
   * else it throws a error
   */
  try {
    if (fs.existsSync(sock)) {
      console.log("Socket file exists, delete it.")
      fs.unlinkSync(sock)
    }
  } catch (e) {
    console.log('failed to reset socket.')
    throw e
    return
  }
}



if (typeof PORT === "string") {
  /*
   * If we use a socket, first delete file if
   * it exists
   */
  resetSocket(PORT)
}



// The `listen` method launches a web server.
app.listen(PORT, (error) => {
  if (error) {
    console.log(error)
  } else {
    // we give rights to socket else nginx can't use it
    // ParseInt PORT because it's always a string when it comes from .env
    if (isNaN(parseInt(PORT)) && fs.lstatSync(PORT).isSocket()) {
      console.log('change socket mode')
      fs.chmodSync(PORT, '777');
    }

    console.info(`Server ready at http://localhost:${PORT}`)
  }
})
