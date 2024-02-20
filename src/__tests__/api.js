const app = require('../server.js')
const supertest = require('supertest')
const { v4: uuidv4 } = require('uuid')
const knex = require('../db/connection')
const db = require('../db')

const request = supertest(app.callback())


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

  /*
  test("retrieving transfers without authentication should fail", async () => {
  })
  */

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
        uuid: uuidv4(),
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
