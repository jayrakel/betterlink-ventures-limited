const db = require('../../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Email Configuration
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const registerUser = async (userData) => {
    const { fullName, email, password, phoneNumber, role, idNumber, kraPin, nextOfKinName, nextOfKinPhone, nextOfKinRelation } = userData;

    // 1. Check if user exists
    const userCheck = await db.query("SELECT * FROM users WHERE email = $1 OR phone_number = $2", [email, phoneNumber]);
    if (userCheck.rows.length > 0) {
        throw new Error("User, Phone, or Email already exists");
    }

    // 2. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const verifyToken = crypto.randomBytes(32).toString('hex');

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 3. Insert User
        const newUser = await client.query(
            `INSERT INTO users (
                full_name, email, password_hash, phone_number, role,
                id_number, kra_pin, next_of_kin_name, next_of_kin_phone, next_of_kin_relation,
                is_email_verified, verification_token, must_change_password
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE, $11, TRUE) 
            RETURNING id, full_name, email, role`,
            [
                fullName, email, hash, phoneNumber, role || 'MEMBER', 
                idNumber, kraPin, nextOfKinName, nextOfKinPhone, nextOfKinRelation,
                verifyToken
            ]
        );

        // 4. Send Verification Email
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const verificationLink = `${frontendUrl}/verify-email?token=${verifyToken}`;

        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: email,
            subject: "Welcome to Sacco - Verify Your Account",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Welcome, ${fullName}!</h2>
                    <p>Your Sacco account has been created.</p>
                    <p><strong>Temporary Password:</strong> ${password}</p>
                    <a href="${verificationLink}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
                </div>
            `
        });

        await client.query('COMMIT');
        return newUser.rows[0];

    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

const loginUser = async (email, password) => {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) throw new Error("Invalid Credentials");

    const user = result.rows[0];

    if (!user.is_email_verified) throw new Error("Please verify your email first.");
    if (!user.is_active) throw new Error("Account deactivated.");

    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) throw new Error("Invalid Credentials");

    const token = jwt.sign(
        { id: user.id, role: user.role, name: user.full_name }, 
        process.env.JWT_SECRET, 
        { expiresIn: '8h' } 
    );

    return { user, token };
};

const verifyEmail = async (token) => {
    const result = await db.query(
        "UPDATE users SET is_email_verified = TRUE, verification_token = NULL WHERE verification_token = $1 RETURNING id, email",
        [token]
    );
    if (result.rows.length === 0) throw new Error("Invalid or expired token.");
    return result.rows[0];
};

const changePassword = async (userId, newPassword) => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    await db.query("UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2", [hash, userId]);
};

module.exports = { registerUser, loginUser, verifyEmail, changePassword };