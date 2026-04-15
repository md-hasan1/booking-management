
import nodemailer from "nodemailer";

 const emailSender = async (to: string, html: string, subject: string) => {
  try {
  const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST || "smtp.brevo.com",
  port: 2525,
  secure: false, 
  auth: {
  user: process.env.BREVO_SMTP_USER || "", 
  pass: process.env.BREVO_SMTP_PASSWORD || "", 
  },
  })
  const mailOptions = {
  from: process.env.BREVO_SMTP_USER || "", 
  to, 
  subject, 
  text: html.replace(/<[^>]+>/g, ""), // Generate plain text version by stripping HTML tags
  html, // HTML email body
  }
  // Send the email
  const info = await transporter.sendMail(mailOptions)
  return info.messageId
  } catch (error) {
  throw new Error("Failed to send email. Please try again later.")
  }
  }

  export default emailSender;


