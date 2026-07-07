import { Worker } from 'adonisjs-scheduler'
import app from '@adonisjs/core/services/app'

const worker = new Worker(app)

app.terminating(async () => {
  await worker.stop()
})

await worker.start()
