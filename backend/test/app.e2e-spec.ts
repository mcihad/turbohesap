import 'reflect-metadata'

import { type INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from '../src/app.module'

// Boots the real app against DATABASE_URL (a throwaway test DB — see the
// test:e2e script). Migrations + seed run on init, so `admin` exists.
describe('App (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    await app.init()
  })

  afterAll(async () => {
    await app?.close()
  })

  const http = () => request(app.getHttpServer())

  it('GET /api/health → 200', () => http().get('/api/health').expect(200))

  it('GET /api/iam/users without token → 401', () =>
    http().get('/api/iam/users').expect(401))

  it('login → access protected route with token', async () => {
    const res = await http()
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin123!' })
      .expect(200)
    const token = res.body.accessToken as string
    expect(token).toBeTruthy()
    await http()
      .get('/api/iam/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
  })

  it('rejects unknown body fields (forbidNonWhitelisted)', () =>
    http()
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin123!', extra: 1 })
      .expect(400))

  it('refresh rotates, and reusing the old token is detected', async () => {
    const login = await http()
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin123!' })
      .expect(200)
    const r1 = login.body.refreshToken as string

    await http().post('/api/auth/refresh').send({ refreshToken: r1 }).expect(200)
    // r1 was rotated → presenting it again is reuse → 401.
    await http().post('/api/auth/refresh').send({ refreshToken: r1 }).expect(401)
  })
})
