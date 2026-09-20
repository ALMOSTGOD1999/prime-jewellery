import { Worker } from 'adonisjs-scheduler'
import app from '@adonisjs/core/services/app'

try {
  const worker = new Worker(app)

  app.terminating(async () => {
    await worker.stop()
  })

  await worker.start()
} catch (error: any) {
  console.error('[Scheduler] Failed to start worker:', error.message)
}
