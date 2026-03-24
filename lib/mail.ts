import nodemailer from "nodemailer";

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    // mailcatcher は TLS 不要。本番では SMTP_SECURE=true を設定する。
    secure: process.env.SMTP_SECURE === "true",
    ...(process.env.SMTP_USER
      ? {
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        }
      : {}),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  const transporter = createTransport();

  await transporter.sendMail({
    from: process.env.MAIL_FROM ?? "noreply@ecs-dashboard.local",
    to,
    subject: "【ECS Dashboard】パスワードリセットのご案内",
    text: [
      "パスワードリセットのリクエストを受け付けました。",
      "",
      "以下のURLにアクセスして、新しいパスワードを設定してください。",
      "",
      resetUrl,
      "",
      "このリンクは1時間有効です。",
      "お心当たりがない場合は、このメールを無視してください。",
    ].join("\n"),
    html: `
      <p>パスワードリセットのリクエストを受け付けました。</p>
      <p>以下のリンクから新しいパスワードを設定してください。</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>このリンクは<strong>1時間</strong>有効です。</p>
      <p>お心当たりがない場合は、このメールを無視してください。</p>
    `,
  });
}
