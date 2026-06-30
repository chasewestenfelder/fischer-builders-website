# Fischer Builders Website

Static one-page site with a Vercel serverless contact form endpoint.

## Contact Form Setup

The frontend posts to `/api/contact`. The endpoint uses Resend and reads all email settings from environment variables, so no API keys or SMTP credentials are exposed in browser code.

## Resend Setup

1. In Resend, go to **API Keys**.
2. Create a new API key for this website.
3. Copy the key once and paste it directly into Vercel as `RESEND_API_KEY`.
4. In Resend, verify a sending domain for production email.

For early testing, Resend may allow its default test sender, but production should use a verified business-domain sender.

## Environment Variables

In Vercel, add these environment variables under the project settings:

```text
RESEND_API_KEY=your_resend_api_key
CONTACT_TO_EMAIL=westenfelderchase@gmail.com
CONTACT_FROM_EMAIL=Fischer Builders <hello@your-verified-domain.com>
```

`CONTACT_FROM_EMAIL` must be a sender/domain verified in Resend. For production, verify the business domain in Resend and use an address on that domain, such as `Fischer Builders <contact@yourdomain.com>`.

## Deploy on Vercel

1. Push this folder to a GitHub repository.
2. Import the repository in Vercel.
3. Use **Other** as the framework preset if Vercel asks.
4. Add the environment variables above in Vercel project settings.
5. Deploy.

After deployment, submit the form once and confirm the email arrives. If sending fails, the site will show a clear error message and keep the visitor on the page.

## What The Email Includes

Each form submission sends:

- Name
- Email
- Phone
- Address
- Message / Notes

The visitor's email is set as the reply-to address, so replying to the notification email should reply to the person who submitted the form.
