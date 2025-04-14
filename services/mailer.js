const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
    CLIENT_ID = "605668616058-p8adtg8onu6p1bp4q41r2o8gijrad4gc.apps.googleusercontent.com",
    YOUR_CLIENT_SECRET = "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",
    "https://developers.google.com/oauthplayground" // Redirect URL
);

oauth2Client.setCredentials({
    refresh_token: "1//04Ciz01oDr4vBCgYIARAAGAQSNwF-L9Ir3TOMKw-ZySBw2Ow-ryRdUPwbBs2WPwKdSazUM1PYD5oGbIHNmrx4Yfk9ywq7EhIO9Fo" // Thay bằng Refresh Token của bạn
});

async function sendEmail(recipients, subject, message) {
    try {
        const accessToken = await oauth2Client.getAccessToken();

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: "cuongtran.giaitri@gmail.com", // Thay bằng email của bạn
                clientId: "605668616058-p8adtg8onu6p1bp4q41r2o8gijrad4gc.apps.googleusercontent.com",
                clientSecret: "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",
                refreshToken: "1//04Ciz01oDr4vBCgYIARAAGAQSNwF-L9Ir3TOMKw-ZySBw2Ow-ryRdUPwbBs2WPwKdSazUM1PYD5oGbIHNmrx4Yfk9ywq7EhIO9Fo",
                accessToken: "ya29.a0AZYkNZiaRgZpfxwM_Qb8fDNwYKEK24dK7D4StPsXbMmlZHmhRySsIOoX8bM8LX68U7298oOcdNL9rDlSdEO_CXwpf53PCtq6poZjcfxfmTAvaHQADbF5IMdKl_mXrYJSKEheIMhUDTMKcnO5E7sT-ji_268QN6Q-7RoX-REsaCgYKAU4SARISFQHGX2Mi3JeH_vhfUdP0wCckht3S0A0175"
            }
        });

        const mailOptions = {
            from: '"Lịch Học" <cuongtran.giaitri@gmail.com>',
            to: recipients.join(','),
            subject: subject,
            text: message
        };

        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully!");
    } catch (error) {
        console.error("Error sending email:", error);
    }
}

module.exports = { sendEmail };

