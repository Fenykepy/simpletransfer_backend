

function humanSize(bytes, precision = 1) {
  if (isNaN(bytes) || ! isFinite(bytes)) return '-'
  let units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
  let number = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + units[number]
}

module.exports = humanSize
