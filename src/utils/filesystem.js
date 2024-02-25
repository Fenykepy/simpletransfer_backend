const fs = require('node:fs/promises')

// returns true if a file exists at path, no matter it's type
async function fileExists(path) {
  try {
    await fs.stat(path)
    return true
  } catch {
    return false
  }
}

// returns true if a file exists at path, and it's a regular file
async function isFile(path) {
  try {
    const stats = await fs.stat(path)
    return stats.isFile()
  } catch {
    return false
  }
}

// returns true if a file exists at path, and it's a directory
async function isDirectory(path) {
  try {
    const stats = await fs.stat(path)
    return stats.isDirectory()
  } catch {
    return false
  }
}


module.exports = {
  fileExists,
  isFile,
  isDirectory,
}
