export async function sendEmail({
  to, from, subject, html, text, replyTo, attachments
}: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: { filename: string; content: string; contentType?: string }[];
}) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const payload: any = {
    from,
    to,                           // <= STRING, не масив
    subject,
    html,
    text,
    reply_to: replyTo || undefined, // <= STRING
  };

  if (attachments?.length) {
    // Resend приема [{ filename, content (base64), contentType? }]
    payload.attachments = attachments.map(a => ({
      filename: a.filename,
      content: a.content,          // base64
      contentType: a.contentType,
    }));
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend failed: ${res.status} ${body}`);
  }
  return res.json();
}
