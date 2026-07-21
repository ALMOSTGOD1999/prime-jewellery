import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

export default class WelcomeMessageService {
  /**
   * Send a welcome email to a newly created user via Resend.
   * Contains user ID and password so the user can log in.
   */
  static async sendWelcomeEmail(name: string, userId: number, password: string, email: string) {
    const apiKey = env.get('RESEND_API_KEY')
    if (!apiKey) {
      logger.warn('RESEND_API_KEY not configured — skipping welcome email')
      return
    }

    const formattedId = `PJ${String(userId).padStart(6, '0')}`
    const appUrl = env.get('APP_URL', 'https://primejewellery.live')

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: 'PRIME Jewellery <noreply@primejewellery.live>',
          to: [email],
          subject: `Welcome to PRIME Jewellery, ${name}!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #fafafa; border-radius: 12px;">
              <div style="text-align: center; margin-bottom: 28px;">
                <div style="display: inline-block; width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, #C5A028, #F5D76E); color: #1a1a2e; font-size: 22px; font-weight: bold; line-height: 52px; text-align: center;">
                  P
                </div>
                <h1 style="color: #C5A028; font-size: 28px; margin: 12px 0 4px;">PRIME</h1>
                <p style="color: #1a1a2e; font-size: 18px; font-weight: bold; margin: 0 0 20px;">Dreams Will Become True</p>
              </div>

              <div style="background: #ffffff; border-radius: 8px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                <h2 style="color: #1a1a2e; font-size: 20px; margin: 0 0 8px;">Welcome, ${name}!</h2>
                <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                  Your PRIME Jewellery account has been created successfully. Here are your login details:
                </p>

                <div style="background: #f5f5f5; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px;">
                  <div style="margin-bottom: 10px;">
                    <span style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">User ID</span>
                    <div style="color: #1a1a2e; font-size: 19px; font-weight: bold; font-family: monospace;">${formattedId}</div>
                  </div>
                  <div>
                    <span style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Password</span>
                    <div style="color: #1a1a2e; font-size: 19px; font-weight: bold; font-family: monospace;">${password}</div>
                  </div>
                </div>

                <a href="${appUrl}/login" style="display: inline-block; background: linear-gradient(135deg, #C5A028, #F5D76E); color: #1a1a2e; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 15px; font-weight: bold;">
                  Login Now
                </a>
              </div>

              <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
                PRIME Jewellery Private Limited &bull; Keep this email safe
              </p>
            </div>
          `,
        }),
      })

      if (!response.ok) {
        const body = await response.text()
        logger.error(`Resend API error: ${response.status} — ${body}`)
        return
      }

      logger.info(`Welcome email sent to ${email}`)
    } catch (error) {
      logger.error(error, 'Failed to send welcome email')
    }
  }
}
