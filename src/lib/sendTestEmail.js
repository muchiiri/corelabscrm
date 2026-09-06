import emailjs from '@emailjs/browser'

const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID

export function sendTestEmail(toEmail, toName) {
  return emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      to_email: toEmail,
      to_name: toName || toEmail,
      subject: 'TaskFlow CRM test email',
      message: 'This is a test email confirming your EmailJS integration is working.',
    },
    { publicKey: PUBLIC_KEY },
  )
}
