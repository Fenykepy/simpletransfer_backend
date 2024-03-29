const app = require('../server.js')
const supertest = require('supertest')
const knex = require('../db/connection')
const db = require('../db')
const filesystem = require('../utils/filesystem')
const { APP_CONFIG } = require('../../transferConfig')
const path = require('path')
const fs = require('node:fs/promises')
const AdmZip = require("adm-zip")
const { v4: uuidv4 } = require('uuid')

const request = supertest(app.callback())

let testDirName = "test_directory"
let testFileName = "test_file.txt"
let testDirPath = path.join(APP_CONFIG.dropboxDirectory, testDirName)
let testFilePath = path.join(APP_CONFIG.dropboxDirectory, testFileName)

async function writeTestFiles() {
  await fs.writeFile(testFilePath, 'Test content!')
  await fs.mkdir(testDirPath)
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

async function createTestRecipients(n, transferPk) {
  // Create fake transfers
  for (let i = 1; i <= n; i++) {
    await db.createRecipient({
      email: `test_recipient${i}@example.com`,
      transfer: transferPk,
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



describe("Test retrieving a specific transfer", () => {
  beforeAll(async () => {
    await setDb()
    await createTestTransfers(5)
    let transfers = await db.getAllTransfers(200)
    for (let transfer of transfers) {
      await createTestRecipients(3, transfer.pk) // create 3 recipients per transfer
    }
  })

  afterAll(async () => {
    await resetDb()
  })

  test("retrieving a specific transfer without authentication should fail", async () => {
  })

  test("retrieving a specific transfer with invalid uuid should fail", async () => {
    let transferUUID = uuidv4()
    let res = await request.get(`/api/transfers/${transferUUID}`)
    expect(res.statusCode).toBe(404)
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].non_field_errors).toBe('The transfer you are looking for could not be retrieved.')
  })

  test("retrieving a specific transfer with valid uuid should succeed and return nested recipients", async () => {
    let transfers = await db.getAllTransfers(200)
    let transferUUID = transfers[3].uuid
    let res = await request.get(`/api/transfers/${transferUUID}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.errors).toBe(undefined)
    expect(res.body.uuid).toBeDefined()
    expect(res.body.created_at).toBeDefined()
    expect(res.body.updated_at).toBe(null)
    expect(res.body.archive_filename).toBe('archive2')
    expect(res.body.original_filename).toBe('filename2')
    expect(res.body.email).toBe('test2@example.com')
    expect(res.body.object).toBe('Test 2')
    expect(res.body.message).toBe('Test 2 message.')
    expect(res.body.complete).toBe(0)
    expect(res.body.active).toBe(1)
    expect(res.body.recipients.length).toBe(3)
    expect(res.body.download_dates.length).toBe(2) // empty json array
    for (let recipient of res.body.recipients) {
      expect(recipient.pk).toBeDefined()
      expect(recipient.uuid).toBeDefined()
      expect(recipient.created_at).toBeDefined()
      expect(recipient.updated_at).toBeDefined()
      expect(recipient.email).toBeDefined()
      expect(recipient.complete).toBe(0)
      expect(recipient.active).toBe(1)
      expect(recipient.download_dates.length).toBe(2) // empty json array
    }
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
    expect(res.body.errors[0].non_field_errors).toBe('No valid field to update')
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
    expect(res.body.errors[1].non_field_errors).toBe('No valid field to update')
  })

  test("updating transfer with invalid active should fail", async () => {
    let transfers = await db.getAllTransfers(1)
    let transferUUID = transfers[0].uuid
    let req = request.put(`/api/transfers/${transferUUID}`)
    let res = await req.send({ active: "a string" })
    expect(res.statusCode).toBe(422)
    expect(res.body.errors.length).toBe(2)
    expect(res.body.errors[0].active).toBe('Invalid boolean')
    expect(res.body.errors[1].non_field_errors).toBe('No valid field to update')
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
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].non_field_errors).toBe('The transfer you want to update could not be retrieved.')
  })

  test("updating transfer with valid email should succeed", async () => {
    let transfers = await db.getAllTransfers(1)
    let transferUUID = transfers[0].uuid
    let req = request.put(`/api/transfers/${transferUUID}`)
    let res = await req.send({ email: 'test@example.com' })
    expect(res.statusCode).toBe(200)
    expect(res.body.errors).toBe(undefined)
    expect(res.body.updated_at).toBeDefined()
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
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].non_field_errors).toBe('The transfer you want to delete could not be retrieved.')
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
    expect(await filesystem.fileExists(testArchivePath)).toBe(false)
  })
})



describe("Test listing dropbox content", () => {
  beforeAll(async () => {
    await writeTestFiles()
  })

  afterAll(async () => {
    await fs.rm(testFilePath)
    await fs.rmdir(testDirPath)
  })

  test("listing dropbox content without authentication should fail", async () => {
  })

  
  test("listing dropbox should return content names and content types", async () => {
    let res = await request.get('/api/listdropbox')
    expect(res.body.errors).toBe(undefined)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(2)
    expect(res.body[0].name).toBe(testDirName)
    expect(res.body[0].isDirectory).toBe(true)
    expect(res.body[1].name).toBe(testFileName)
    expect(res.body[1].isDirectory).toBe(false)
  })
})



describe("Test creating recipient", () => {
  beforeAll(async () => {
    await setDb()
    await createTestTransfers(1)
  })

  afterAll(async () => {
    await resetDb()
  })

  test("creating recipient without authentication should fail", async () => {
  })

  test("creating recipient with invalid transfer uuid should fail", async () => {
    let newRecipient = {
      email: "test@example.com",
      transfer: uuidv4(),
    }
    let req = request.post('/api/recipients')
    let res = await req.send(newRecipient)
    expect(res.statusCode).toBe(422)
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].transfer).toBe('Invalid transfer UUID')
  })

  test("creating recipient with empty transfer uuid should fail", async () => {
    let newRecipient = {
      email: "test@example.com",
      transfer: ' ',
    }
    let req = request.post('/api/recipients')
    let res = await req.send(newRecipient)
    expect(res.statusCode).toBe(422)
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].transfer).toBe('Invalid transfer UUID')
  })

  test("creating recipient with empty email should fail", async () => {
    let transfers = await db.getAllTransfers(1)
    let newRecipient = {
      email: "",
      transfer: transfers[0].uuid,
    }
    let req = request.post('/api/recipients')
    let res = await req.send(newRecipient)
    expect(res.statusCode).toBe(422)
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].email).toBe('Invalid email')
  })

  test("creating recipient with invalid email should fail", async () => {
    let transfers = await db.getAllTransfers(1)
    let newRecipient = {
      email: 'invalid@transfer@test.bizarre',
      transfer: transfers[0].uuid,
    }
    let req = request.post('/api/recipients')
    let res = await req.send(newRecipient)
    expect(res.statusCode).toBe(422)
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].email).toBe('Invalid email')
  })

  test("creating recipient with valid data should return it", async () => {
    let transfers = await db.getAllTransfers(1)
    let newRecipient = {
      email: 'test@example.com',
      transfer: transfers[0].uuid,
    }
    let req = request.post('/api/recipients')
    let res = await req.send(newRecipient)
    expect(res.body.errors).toBe(undefined)
    expect(res.statusCode).toBe(201)
    expect(res.body.uuid).toBeDefined()
    expect(res.body.created_at).toBeDefined()
    expect(res.body.updated_at).toBe(null)
    expect(res.body.email).toBe('test@example.com')
    expect(res.body.complete).toBe(0)
    expect(res.body.active).toBe(1)
  })
})



describe("Test updating recipient", () => {
  beforeAll(async () => {
    await setDb()
    await createTestTransfers(3)
    let transfers = await db.getAllTransfers(200) 
    await createTestRecipients(5, transfers[0].pk)
  })

  afterAll(async () => {
    await resetDb()
  })

  test("updating a recipient without authentication should fail", async () => {
  })

  test("updating recipient with unupdatable fields should fail", async () => {
    let recipients = await db.getAllRecipients(1)
    let recipientUUID = recipients[0].uuid
    let req = request.put(`/api/recipients/${recipientUUID}`)
    let res = await req.send({ 
      pk: 3,
      uuid: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
      email: 'new@example.com',
      transfer: 2,
      complete: true,
      download_dates: ["2023"],
      email_sent_at: ["2022"],
    })
    expect(res.statusCode).toBe(422)
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].active).toBe('Invalid value')
  })

  test("updating recipient with invalid active field should fail", async () => {
    let recipients = await db.getAllRecipients(1)
    let recipientUUID = recipients[0].uuid
    let req = request.put(`/api/recipients/${recipientUUID}`)
    let res = await req.send({ 
      active: "test"
    })
    expect(res.statusCode).toBe(422)
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].active).toBe('Invalid value')
  })

  test("updating recipient with invalid uuid should fail", async () => {
    let recipientUUID = uuidv4()
    let req = request.put(`/api/recipients/${recipientUUID}`)
    let res = await req.send({ 
      active: false
    })
    expect(res.statusCode).toBe(404)
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].non_field_errors).toBe('The recipient you want to update could not be retrieved.')
  })

  test("updating recipient with valid active should succeed", async () => {
    let recipients = await db.getAllRecipients(1)
    let recipientUUID = recipients[0].uuid
    let req = request.put(`/api/recipients/${recipientUUID}`)
    let res = await req.send({ 
      active: false
    })
    expect(res.statusCode).toBe(200)
    expect(res.body.errors).toBe(undefined)
    expect(res.body.uuid).toBeDefined()
    expect(res.body.updated_at).toBeDefined()
    expect(res.body.active).toBe(0)
  })
})



describe("Test retrieving a specific download", () => {
  beforeAll(async () => {
    await setDb()
    await createTestTransfers(5)
    let transfers = await db.getAllTransfers(200)
    for (let transfer of transfers) {
      await createTestRecipients(3, transfer.pk) // create 3 recipients per transfer
    }
  })

  afterAll(async () => {
    await resetDb()
  })

  test("retrieving a specific download with invalid uuid should fail", async () => {
    let downloadUUID = uuidv4()
    let res = await request.get(`/downloads/${downloadUUID}`)
    expect(res.statusCode).toBe(404)
    expect(res.headers["content-type"].substring(0,9)).toBe("text/html")
  })

  test("retrieving a specific download with transfer uuid should succeed", async () => {
    let transfers = await db.getAllTransfers(200)
    let transferUUID = transfers[3].uuid
    let res = await request.get(`/downloads/${transferUUID}`)
    expect(res.statusCode).toBe(200)
    expect(res.headers["content-type"].substring(0,9)).toBe("text/html")
  })

  test("retrieving a specific download with recipient uuid should succeed", async () => {
    let transfers = await db.getAllTransfers(200)
    let recipients = await db.getTransferRecipients(transfers[3].pk)
    let recipientUUID = recipients[0].uuid
    let res = await request.get(`/downloads/${recipientUUID}`)
    expect(res.statusCode).toBe(200)
    expect(res.headers["content-type"].substring(0,9)).toBe("text/html")
  })

  test("retrieving a specific download with deactivated recipient uuid should fail", async () => {
    let transfers = await db.getAllTransfers(200)
    let recipients = await db.getTransferRecipients(transfers[3].pk)
    let recipientUUID = recipients[0].uuid
    await db.updateRecipient(recipientUUID, { active: false })
    let res = await request.get(`/downloads/${recipientUUID}`)
    expect(res.statusCode).toBe(410)
    expect(res.headers["content-type"].substring(0,9)).toBe("text/html")
  })

  test("retrieving a specific download with deactivated transfer uuid should fail", async () => {
    let transfers = await db.getAllTransfers(200)
    let transferUUID = transfers[3].uuid
    await db.updateTransfer(transfers[3].uuid, { active: false })
    let res = await request.get(`/downloads/${transferUUID}`)
    expect(res.statusCode).toBe(410)
    expect(res.headers["content-type"].substring(0,9)).toBe("text/html")
  })
})



const zipFilename = 'test.zip'
const zipContent = "Test content!"
const zipPath = path.join(APP_CONFIG.transfersDirectory, zipFilename)
describe("Test downloading archive stream", () => {
  
  beforeAll(async () => {
    await setDb()
    await createTestTransfers(1)
    let transfers = await db.getAllTransfers(200)
    for (let transfer of transfers) {
      await createTestRecipients(3, transfer.pk) // create 3 recipients per transfer
    }
    
    let zip = new AdmZip()
    zip.addFile(zipFilename, Buffer.from(zipContent, "utf8"), "entry comment goes here")
    zip.writeZip(zipPath)

    await db.updateTransfer(transfers[0].uuid, { archive_filename: zipFilename })
  })

  afterAll(async () => {
    if (await filesystem.fileExists(zipPath)) {
      await fs.rm(zipPath)
    }
    await resetDb()
  })

  test("downloading with invalid uuid should fail", async () => {
    let downloadUUID = uuidv4()
    let res = await request.get(`/stream/${downloadUUID}`)
    expect(res.statusCode).toBe(404)
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].non_field_errors).toBe('The transfer you are looking for could not be retrieved.')
  })
  
  test("downloading with transfer uuid should succeed", async () => {
    let transfers = await db.getAllTransfers(200)
    let transferUUID = transfers[0].uuid
    let res = await request.get(`/stream/${transferUUID}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.errors).toBe(undefined)
    
    let transfer = await db.getTransferDetail(transferUUID)
    expect(JSON.parse(transfer.download_dates).length).toBe(1)
    expect(transfer.complete).toBe(0)
    for (let recipient of transfer.recipients) {
      expect(recipient.complete).toBe(0)
    }
  })
  
  test("downloading with recipient uuid should succeed", async () => {
    let transfers = await db.getAllTransfers(200)
    let recipients = await db.getTransferRecipients(transfers[0].pk)
    let recipientUUID = recipients[0].uuid
    let res = await request.get(`/stream/${recipientUUID}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.errors).toBe(undefined)    

    let transfer = await db.getTransferByUUID(transfers[0].uuid)
    expect(JSON.parse(transfer.download_dates).length).toBe(2)
    expect(transfer.complete).toBe(0)

    let recipient = await db.getRecipientByUUID(recipientUUID)
    expect(JSON.parse(recipient.download_dates).length).toBe(1)
    expect(recipient.complete).toBe(1)
  })
  
  test("downloading last recipient uuid should mark transfer as complete", async () => {
    let transfers = await db.getAllTransfers(200)
    let recipients = await db.getTransferRecipients(transfers[0].pk)
    for (let recipient of recipients) {
      let res = await request.get(`/stream/${recipient.uuid}`)
      expect(res.statusCode).toBe(200)
      expect(res.body.errors).toBe(undefined)    
    }

    let transfer = await db.getTransferByUUID(transfers[0].uuid)
    expect(JSON.parse(transfer.download_dates).length).toBe(5)
    expect(transfer.complete).toBe(1)
  })

  test("downloading with deactivated recipient uuid should fail", async () => {
    let transfers = await db.getAllTransfers(200)
    let recipients = await db.getTransferRecipients(transfers[0].pk)
    let recipientUUID = recipients[0].uuid
    await db.updateRecipient(recipientUUID, { active: false })
    let res = await request.get(`/stream/${recipientUUID}`)
    expect(res.statusCode).toBe(404)
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].non_field_errors).toBe('The transfer you are looking for could not be retrieved.')
  })

  test("downloading with deactivated transfer uuid should fail", async () => {
    let transfers = await db.getAllTransfers(200)
    let transferUUID = transfers[0].uuid
    await db.updateTransfer(transferUUID, { active: false })
    let res = await request.get(`/stream/${transferUUID}`)
    expect(res.statusCode).toBe(404)
    expect(res.body.errors.length).toBe(1)
    expect(res.body.errors[0].non_field_errors).toBe('The transfer you are looking for could not be retrieved.')
  })
})

