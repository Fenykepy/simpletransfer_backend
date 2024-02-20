function isNotEmptyString(str) {
  if (!str || str.trim().length === 0) {
    return false
  }
  return true
}


function isValidEmail(str) {
  if (!isNotEmptyString(str)) return false
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  if (!re.test(str.toLowerCase()) || str.length > 255) return false
  return true
}

function isNullOrUndefined(value) {
  return value === undefined || value === null
}

function isBoolean(value) {
  return typeof value == "boolean"
}

module.exports = {
  isNotEmptyString,
  isValidEmail,
  isNullOrUndefined,
  isBoolean,
}
