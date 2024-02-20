const app = require('../server.js')
const supertest = require('supertest')
const knex = require('../db/connection')
const db = require('../db')
const { APP_CONFIG } = require('../../transferConfig')
const path = require('path')
const fs = require('node:fs/promises')
const { v4: uuidv4 } = require('uuid')

const request = supertest(app.callback())

let testDirName = "test_directory"
let testFileName = "test_file.txt"
let testDirPath = path.join(APP_CONFIG.dropboxDirectory, testDirName)
let testFilePath = path.join(APP_CONFIG.dropboxDirectory, testFileName)

async function writeTestFiles() {
  await fs.writeFile(testFilePath, 'Test content!')
  await fs.mkdir(testDirPath)
  const files = await fs.readdir(APP_CONFIG.dropboxDirectory)
}

async function deleteTestFiles() {
  const transfers = await db.getAllTransfers(1000)
  for (const transfer of transfers) {
    // Delete transfer file if any
    try {
      await fs.rm(path.join(APP_CONFIG.transfersDirectory, transfer.archive_filename))
    } catch (error) {
      console.log(error)
    }
  }
  await fs.rm(testFilePath)
  await fs.rmdir(testDirPath)
}

async function createTestTransfers(n) {
  // Create fake transfers
  for (let i = 1; i <= n; i++) {
    await db.createTransfer({
      email: `test${i}@example.com`,
      object: `Test ${i}`,
      message: `Test ${i} message.`,
      original_filename: `filename${i}`,
      archive_filename: `archive${i}`,
    })
  }
}

async function setDb() {
  await knex.migrate.rollback()
  await knex.migrate.latest()
  await knex.seed.run()
}

async function resetDb() {
  await knex.migrate.rollback()
}

afterAll(async () => {
  await knex.destroy()
})

describe("Test retrieving transfers", () => {
  beforeAll(async () => {
    await setDb()
  })

  afterAll(async () => {
    await resetDb()
  })

  test("retrieving transfers without authentication should fail", async () => {
  })

  test("retrieving transfers should return empty array", async () => {
    let res = await request.get('/api/transfers')
    expect(res.body.errors).toBe(undefined)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(0)
  })

  test("retrieving transfers should return them ordered by date", async () => {
    await createTestTransfers(5)

    let res = await request.get('/api/transfers')
    expect(res.body.errors).toBe(undefined)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(5)
    expect(res.body[0].object).toBe("Test 5")
    expect(res.body[4].object).toBe("Test 1")
  })
})



describe("Test creating transfer", () => {
  beforeAll(async () => {
    await setDb()
    await writeTestFiles()
  })

  afterAll(async () => {
    await deleteTestFiles()
    await resetDb()
  })

  test("creating transfer without authentication should fail", async () => {
  })

  test("creating transfer with empty email should fail", async () => {
    let newTransfer = {
      email: '',
      object: 'Transfer object',
      message: 'Transfer message',
      dropfile: testDirName,
    }
    
    let req = request.post('/api/transfers')
    let res = await req.send(newTransfer)
    expect(res.statusCode).toBe(422)
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].email).toBe('Invalid email')
  })

  test("creating transfer with invalid email should fail", async () => {
    let newTransfer = {
      email: 'invalid@transfer@test.bizarre',
      object: 'Transfer object',
      message: 'Transfer message',
      dropfile: testDirName,
    }
    
    let req = request.post('/api/transfers')
    let res = await req.send(newTransfer)
    expect(res.statusCode).toBe(422)
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].email).toBe('Invalid email')
  })

  test("creating transfer with empty object should fail", async () => {
    let newTransfer = {
      email: 'test@example.com',
      object: '',
      message: 'Transfer message',
      dropfile: testDirName,
    }
    
    let req = request.post('/api/transfers')
    let res = await req.send(newTransfer)
    expect(res.statusCode).toBe(422)
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].object).toBe('This field is required')
  })

  test("creating transfer with empty message should fail", async () => {
    let newTransfer = {
      email: 'test@example.com',
      object: 'Transfer object',
      message: '',
      dropfile: testDirName
    }
    
    let req = request.post('/api/transfers')
    let res = await req.send(newTransfer)
    expect(res.statusCode).toBe(422)
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].message).toBe('This field is required')
  })

  test("creating transfer with empty dropfile should fail", async () => {
    let newTransfer = {
      email: 'test@example.com',
      object: 'Transfer object',
      message: 'Transfer message',
      dropfile: ''
    }
    
    let req = request.post('/api/transfers')
    let res = await req.send(newTransfer)
    expect(res.statusCode).toBe(422)
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].dropfile).toBe('This field is required')
  })

  test("creating transfer with invalid dropfile should fail", async () => {
    let newTransfer = {
      email: 'test@example.com',
      object: 'Transfer object',
      message: 'Transfer message',
      dropfile: 'testTast.pdf'
    }
    
    let req = request.post('/api/transfers')
    let res = await req.send(newTransfer)
    expect(res.statusCode).toBe(422)
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].dropfile).toBe('Invalid dropfile')
  })

  test("creating transfer with valid data should return it", async () => {
    let newTransfer = {
      email: 'test@example.com',
      object: 'Transfer object',
      message: 'Transfer message',
      dropfile: testDirName,
    }
    
    let req = request.post('/api/transfers')
    let res = await req.send(newTransfer)

    //console.log('body', res.body)
    expect(res.body.errors).toBe(undefined)
    expect(res.statusCode).toBe(201)
    expect(res.body.uuid).toBeDefined()
    expect(res.body.created_at).toBeDefined()
    expect(res.body.updated_at).toBe(null)
    expect(res.body.email).toBe('test@example.com')
    expect(res.body.original_filename).toBe(testDirName)
    expect(res.body.archive_filename).toBeDefined()
    expect(res.body.object).toBe('Transfer object')
    expect(res.body.message).toBe('Transfer message')
    expect(res.body.complete).toBe(0)
    expect(res.body.active).toBe(1)
    expect(res.body.archive_size).toBeDefined()
    
    const stats = await fs.stat(path.join(APP_CONFIG.transfersDirectory, res.body.archive_filename))
    expect(stats.isFile()).toBe(true)
  })
})


describe("Test updating a transfer", () => {
  beforeAll(async () => {
    await setDb()
    await createTestTransfers(5)
  })

  afterAll(async () => {
    await resetDb()
  })

  test("updating a transfer without authentication should fail", async () => {
  })

  test("updating transfer with unupdatable fields should fail", async () => {
    let transfers = await db.getAllTransfers(1)
    let transferUUID = transfers[0].uuid
    let req = request.put(`/api/transfers/${transferUUID}`)
    let res = await req.send({ 
      pk: 3,
      uuid: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
      archive_filename: "test",
      original_filename: "test",
      object: "test",
      message: "test",
      complete: true,
    })
    expect(res.statusCode).toBe(422)
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].misc).toBe('No valid field to update')
  })

  test("updating transfer with empty email and valid active should fail", async () => {
    let transfers = await db.getAllTransfers(1)
    let transferUUID = transfers[0].uuid
    let req = request.put(`/api/transfers/${transferUUID}`)
    let res = await req.send({ email: ' ', active: true })
    expect(res.statusCode).toBe(422)
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].email).toBe('Invalid email')
  })

  test("updating transfer with invalid email and valid active should fail", async () => {
    let transfers = await db.getAllTransfers(1)
    let transferUUID = transfers[0].uuid
    let req = request.put(`/api/transfers/${transferUUID}`)
    let res = await req.send({ email: 'invalid@test.mail.@.net', active: true })
    expect(res.statusCode).toBe(422)
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].email).toBe('Invalid email')
  })

  test("updating transfer with invalid active should fail", async () => {
    let transfers = await db.getAllTransfers(1)
    let transferUUID = transfers[0].uuid
    let req = request.put(`/api/transfers/${transferUUID}`)
    let res = await req.send({ active: "a string" })
    expect(res.statusCode).toBe(422)
    expect(res.body.errors.length).toBe(2)
    expect(res.body.errors[0].active).toBe('Invalid boolean')
    expect(res.body.errors[1].misc).toBe('No valid field to update')
  })

  test("updating transfer with invalid active should fail", async () => {
    let transfers = await db.getAllTransfers(1)
    let transferUUID = transfers[0].uuid
    let req = request.put(`/api/transfers/${transferUUID}`)
    let res = await req.send({ active: "a string" })
    expect(res.statusCode).toBe(422)
    expect(res.body.errors.length).toBe(2)
    expect(res.body.errors[0].active).toBe('Invalid boolean')
    expect(res.body.errors[1].misc).toBe('No valid field to update')
  })

  test("updating transfer with valid active should succeed", async () => {
    let transfers = await db.getAllTransfers(1)
    let transferUUID = transfers[0].uuid
    let req = request.put(`/api/transfers/${transferUUID}`)
    let res = await req.send({ active: false })
    expect(res.statusCode).toBe(200)
    expect(res.body.errors).toBe(undefined)
    expect(res.body.uuid).toBeDefined()
    expect(res.body.active).toBe(0)
  })

  test("updating transfer with invalid uuid should fail", async () => {
    let transferUUID = uuidv4()
    let req = request.put(`/api/transfers/${transferUUID}`)
    let res = await req.send({ email: 'test@example.com' })
    expect(res.statusCode).toBe(404)
    expect(res.body.error).toBe('The transfer you want to update could not be retrieved.')
  })

  test("updating transfer with valid email should succeed", async () => {
    let transfers = await db.getAllTransfers(1)
    let transferUUID = transfers[0].uuid
    let req = request.put(`/api/transfers/${transferUUID}`)
    let res = await req.send({ email: 'test@example.com' })
    expect(res.statusCode).toBe(200)
    expect(res.body.errors).toBe(undefined)
    expect(res.body.uuid).toBeDefined()
    expect(res.body.email).toBe('test@example.com')
  })
})


const testArchiveName = 'testArchive.zip'
const testArchivePath = path.join(APP_CONFIG.transfersDirectory, testArchiveName)
describe("Test deleting a transfer", () => {
  beforeAll(async () => {
    await setDb()
    await createTestTransfers(1)
    await fs.writeFile(testArchivePath, 'Test content!')
  })

  afterAll(async () => {
    await resetDb()
    try {
      await fs.rm(testArchivePath)
    } catch (error) {
      //console.log(error)
    }
  })

  test("deleting a transfer without authentication should fail", async () => {
  })

  test("deleting a transfer with invalid uuid should fail", async () => {
    let transferUUID = uuidv4()
    let res = await request.delete(`/api/transfers/${transferUUID}`)
    expect(res.statusCode).toBe(404)
    expect(res.body.error).toBe('The transfer you want to delete could not be retrieved.')
  })

  test("deleting a transfer with valid uuid should succeed", async () => {
    let transfers = await db.getAllTransfers(1)
    let transferUUID = transfers[0].uuid

    // We update transfer with testArchive to ensure it deletes the archive
    await db.updateTransfer(transferUUID, { archive_filename: testArchiveName })

    let res = await request.delete(`/api/transfers/${transferUUID}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.errors).toBe(undefined)

    // transfer mustn't be anymore in db 
    let transfer = await db.getTransferByUUID(transferUUID)
    expect(transfer).toBe(undefined)

    // archive file must have been deleted
    let fileExists
    try {
      await fs.stat(testArchivePath)
      fileExists = true
    } catch {
      fileExists = false
    }
    expect(fileExists).toBe(false)
  })
})


