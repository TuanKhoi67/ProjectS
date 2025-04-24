const { google } = require("googleapis");
const nodemailer = require("nodemailer");

// Cấu hình OAuth2
const oauth2Client = new google.auth.OAuth2(
    //GOOGLE_CALENDAR_ID = "primaryhttps://calendar.google.com/calendar/embed?src=cuongtran.giaitri%40gmail.com&ctz=Asia%2FHo_Chi_Minhcuongtran.giaitri@gmail.comcuongtran.giaitri@gmail.com",
    GOOGLE_CLIENT_ID = "605668616058-p8adtg8onu6p1bp4q41r2o8gijrad4gc.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET = "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",
    GOOGLE_REFRESH_TOKEN = "1//04Y3zl8OzMCSMCgYIARAAGAQSNwF-L9Ireoy0dSunkbwklGZUQOvQ4WMzgVoZU4zXMQwxOQ4XNqeLKBLcKOqV52bJNn0C8AP57Gw",
    REDIRECT_URI = "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({ refresh_token: "1//04Y3zl8OzMCSMCgYIARAAGAQSNwF-L9Ireoy0dSunkbwklGZUQOvQ4WMzgVoZU4zXMQwxOQ4XNqeLKBLcKOqV52bJNn0C8AP57Gw" });

const calendar = google.calendar({ version: "v3", auth: oauth2Client });

// Hàm tạo lịch họp Google Meet
async function createGoogleMeet(eventData) {
    try {
        const event = {
            summary: eventData.title,
            location: eventData.location,
            description: eventData.note,
            start: { dateTime: eventData.startTime, timeZone: "Asia/Ho_Chi_Minh" },
            end: { dateTime: eventData.endTime, timeZone: "Asia/Ho_Chi_Minh" },
            //attendees: eventData.attendees.map(email => ({ email })),
            conferenceData: {
                createRequest: {
                    requestId: Math.random().toString(36).substring(2),
                    conferenceSolutionKey: { type: "hangoutsMeet" },
                },
            },
        };

        const response = await calendar.events.insert({
            calendarId: "primary",
            resource: event,
            conferenceDataVersion: 1,
        });

        return response.data;
    } catch (error) {
        console.error("Lỗi khi tạo Google Meet:", error);
        throw error;
    }
}

// Hàm gửi email với OAuth2
async function sendEmail(recipients, subject, message) {
    try {
        const accessToken = await oauth2Client.getAccessToken();

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: "cuongtran.giaitri@gmail.com", // Email gửi
                clientId: "605668616058-p8adtg8onu6p1bp4q41r2o8gijrad4gc.apps.googleusercontent.com",
                clientSecret: "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",
                refreshToken: "1//04Ciz01oDr4vBCgYIARAAGAQSNwF-L9Ir3TOMKw-ZySBw2Ow-ryRdUPwbBs2WPwKdSazUM1PYD5oGbIHNmrx4Yfk9ywq7EhIO9Fo",
                accessToken: "ya29.a0AZYkNZiaRgZpfxwM_Qb8fDNwYKEK24dK7D4StPsXbMmlZHmhRySsIOoX8bM8LX68U7298oOcdNL9rDlSdEO_CXwpf53PCtq6poZjcfxfmTAvaHQADbF5IMdKl_mXrYJSKEheIMhUDTMKcnO5E7sT-ji_268QN6Q-7RoX-REsaCgYKAU4SARISFQHGX2Mi3JeH_vhfUdP0wCckht3S0A0175",
            }
        });

        const mailOptions = {
            from: `"Lịch Họp" <cuongtran.giaitri@gmail.com>`,
            to: recipients.join(','),
            subject: subject,
            text: message
        };

        await transporter.sendMail(mailOptions);
        console.log("📧 Email đã được gửi!");
    } catch (error) {
        console.error("❌ Lỗi khi gửi email:", error);
    }
}

module.exports = { createGoogleMeet, sendEmail };

