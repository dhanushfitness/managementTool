import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function sendTestEmail() {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.TEST_EMAIL,
      subject: "Welcome to AirFit Luxury Club",
      text: "Welcome to AirFit Luxury Club!",
      html: `
        <h2>Welcome to AirFit Luxury Club! 🎉</h2>
        <p>Thank you for choosing <b>AirFit Luxury Club</b>.</p>
        <p>Your email notifications are now working successfully.</p>

        <br>

        <p>Regards,</p>
        <p><b>AirFit Luxury Club</b></p>
      `,
    });

    console.log("✅ Email sent successfully");
    console.log(info.messageId);
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

sendTestEmail();