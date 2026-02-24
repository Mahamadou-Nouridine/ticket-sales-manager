import nodemailer from "nodemailer";

const { MAILER_PASS, MAIL_SENDER, MAIL_SERVICE } = process.env;

const transporter = nodemailer.createTransport({
    service: MAIL_SERVICE,
    auth: {
        user: MAIL_SENDER,
        pass: MAILER_PASS,
    },
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
});

export default transporter;
