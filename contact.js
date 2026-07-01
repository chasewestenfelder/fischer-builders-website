const RESEND_API_URL = "https://api.resend.com/emails";
const REQUIRED_FIELDS = ["name", "email", "phone", "address", "message"];

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function readProviderError(emailResponse) {
  const text = await emailResponse.text().catch(() => "");

  if (!text) {
    return `Resend returned HTTP ${emailResponse.status}.`;
  }

  try {
    const parsed = JSON.parse(text);
    return parsed.message || parsed.error || text;
  } catch (error) {
    return text;
  }
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string") {
    return JSON.parse(request.body);
  }

  let body = "";
  for await (const chunk of request) {
    body += chunk;
  }

  return body ? JSON.parse(body) : {};
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: "Invalid request body." });
    return;
  }

  const submission = {
    name: String(body.name || "").trim(),
    email: String(body.email || "").trim(),
    phone: String(body.phone || "").trim(),
    address: String(body.address || "").trim(),
    message: String(body.message || "").trim()
  };

  const missingField = REQUIRED_FIELDS.find((field) => !submission[field]);

  if (missingField) {
    sendJson(response, 400, { error: "Please complete all required fields." });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submission.email)) {
    sendJson(response, 400, { error: "Please enter a valid email address." });
    return;
  }

  // Add these environment variables in Vercel before deploying:
  // RESEND_API_KEY: your Resend API key.
  // CONTACT_TO_EMAIL: where contact form submissions should be delivered.
  // CONTACT_FROM_EMAIL: a verified Resend sender, such as "Fischer Builders <hello@yourdomain.com>".
  const resendApiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;
  const debugErrors = process.env.CONTACT_DEBUG === "true";

  if (!resendApiKey || !toEmail || !fromEmail) {
    sendJson(response, 500, { error: "Email service is not configured yet." });
    return;
  }

  const safe = Object.fromEntries(
    Object.entries(submission).map(([key, value]) => [key, escapeHtml(value)])
  );

  const emailPayload = {
    from: fromEmail,
    to: [toEmail],
    reply_to: submission.email,
    subject: `New website request from ${submission.name}`,
    html: `
      <h2>New Fischer Builders Website Request</h2>
      <p><strong>Name:</strong> ${safe.name}</p>
      <p><strong>Email:</strong> ${safe.email}</p>
      <p><strong>Phone:</strong> ${safe.phone}</p>
      <p><strong>Address:</strong> ${safe.address}</p>
      <p><strong>Message / Notes:</strong></p>
      <p>${safe.message.replaceAll("\n", "<br>")}</p>
    `,
    text: [
      "New Fischer Builders Website Request",
      "",
      `Name: ${submission.name}`,
      `Email: ${submission.email}`,
      `Phone: ${submission.phone}`,
      `Address: ${submission.address}`,
      "",
      "Message / Notes:",
      submission.message
    ].join("\n")
  };

  try {
    const emailResponse = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(emailPayload)
    });

    if (!emailResponse.ok) {
      const providerError = await readProviderError(emailResponse);
      console.error("Resend send failed", {
        status: emailResponse.status,
        error: providerError
      });
      sendJson(response, 502, {
        error: debugErrors
          ? `Email provider rejected the message: ${providerError}`
          : "The message could not be sent. Please call or email us directly."
      });
      return;
    }

    sendJson(response, 200, { ok: true });
  } catch (error) {
    console.error("Contact form email send failed", error);
    sendJson(response, 502, {
      error: debugErrors
        ? `Email send failed: ${error.message}`
        : "The message could not be sent. Please call or email us directly."
    });
  }
};
