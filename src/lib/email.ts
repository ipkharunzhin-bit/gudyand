import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL!;

export async function sendConfirmationEmail(to: string, code: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const confirmUrl = `${appUrl}/confirm-email?code=${code}&email=${encodeURIComponent(to)}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Подтверждение регистрации",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Подтверждение email</h2>
        <p>Код для подтверждения: <strong>${code}</strong></p>
        <p>Или перейдите по ссылке:</p>
        <a href="${confirmUrl}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:8px">
          Подтвердить
        </a>
      </div>
    `,
  });
}