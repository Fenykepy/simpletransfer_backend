const app = require('../server.js')
const supertest = require('supertest')
const knex = require('../db/connection')
const db = require('../db')
const { APP_CONFIG } = require('../../transferConfig')
const path = require('path')
const fs = require('node:fs/promises')

const request = supertest(app.callback())

let testDirName = "test_directory"
let testFileName = "test_file.txt"
let testDirPath = path.join(APP_CONFIG.dropboxDirectory, testDirName)
let testFilePath = path.join(APP_CONFIG.dropboxDirectory, testFileName)

async function writeTestFiles() {
  await fs.writeFile(testFilePath, 'Test content!')
  await fs.mkdir(testDirPath)
  console.log('Successfully wrote files!')
  console.log(testDirPath, testFilePath)
  const files = await fs.readdir(APP_CONFIG.dropboxDirectory)
  console.log('Files:', files)
}

async function deleteTestFiles() {
  await fs.rm(testFilePath)
  await fs.rmdir(testDirPath)
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
    // Create fake transfers
    for (let i = 0; i < 5; i++) {
      await db.createTransfer({
        email: `test${i}@example.com`,
        object: `Test ${i}`,
        message: `Test ${i} message.`,
        original_filename: `filename${i}`,
        archive_filename: `archive${i}`,
      })
    }

    let res = await request.get('/api/transfers')
    expect(res.body.errors).toBe(undefined)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(5)
    expect(res.body[0].object).toBe("Test 4")
    expect(res.body[4].object).toBe("Test 0")
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
  })
})
