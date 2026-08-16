export async function sendEmail(to: string, subject: string, body: string): Promise<{ sent: true; to: string; subject: string }> {
  await new Promise((r) => setTimeout(r, 80));
  return { sent: true, to, subject };
}
