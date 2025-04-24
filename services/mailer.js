const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
    CLIENT_ID = "605668616058-p8adtg8onu6p1bp4q41r2o8gijrad4gc.apps.googleusercontent.com",
    YOUR_CLIENT_SECRET = "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",
    "https://developers.google.com/oauthplayground" // Redirect URL
);

oauth2Client.setCredentials({
    refresh_token: "1//04qrTqdtilMkJCgYIARAAGAQSNwF-L9Iry_hSCpducldqeiFxMIk1lCgRvr_jPNhbBkWCtpgFsPbTBO3VAwQY4PozuteNaHOC9FM" // Thay bằng Refresh Token của bạn
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
                refreshToken: "1//04qrTqdtilMkJCgYIARAAGAQSNwF-L9Iry_hSCpducldqeiFxMIk1lCgRvr_jPNhbBkWCtpgFsPbTBO3VAwQY4PozuteNaHOC9FM",
                accessToken: accessToken
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
