const fs = require('node:fs/promises')

async function fileExists(path) {
  try {
    await fs.stat(path)
    return true
  } catch {
    return false
  }
}

module.exports = {
  fileExists,
}
