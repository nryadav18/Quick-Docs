require('dotenv').config({ override: true });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Storage } = require('@google-cloud/storage');
const multer = require('multer')
const fs = require('fs')
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const path = require('path')
const axios = require('axios')
// const { SpeechClient } = require('@google-cloud/speech').v1;
const app = express();
const Razorpay = require("razorpay");
const vision = require('@google-cloud/vision');
const sgMail = require('@sendgrid/mail')
const client = new vision.ImageAnnotatorClient();
const AES_SECRET_KEY = Buffer.from(process.env.AES_SECRET_KEY, 'base64');
if (AES_SECRET_KEY.length !== 32) throw new Error('AES key must be 32 bytes');
const IV_LENGTH = 16;
const langs = require('langs');
const { SarvamAIClient } = require('sarvamai');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const storage = new Storage({
    keyFilename: path.resolve(__dirname, `${process.env.GOOGLE_APPLICATION_CREDENTIALS}`),
    projectId: `${process.env.GOOGLE_PROJECT_ID}`,
});

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
const upload = multer({ storage: multer.memoryStorage() });
// const speechClient = new SpeechClient();

const sarvamClient = new SarvamAIClient({
    apiSubscriptionKey: process.env.SARVAM_API_KEY
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("MongoDB error:", err));

// Encryption Function
function encrypt(text) {
    if (!text) return text;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(AES_SECRET_KEY), iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return iv.toString('base64') + ':' + encrypted;
}

// Decryption Function
function decryptSafe(encrypted) {
    if (!encrypted || typeof encrypted !== 'string' || !encrypted.includes(':')) {
        console.warn('Invalid encrypted format:', encrypted);
        return encrypted; // return as-is or null
    }

    const [ivBase64, encryptedText] = encrypted.split(':');
    const iv = Buffer.from(ivBase64, 'base64');

    if (iv.length !== 16) {
        console.warn('Invalid IV length for:', encrypted);
        return encrypted;
    }

    const decipher = crypto.createDecipheriv('aes-256-cbc', AES_SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}


// Hash Values Generation
function hashValues(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}

function formatAnalyticsData(entries) {
    const groupedData = {
        daily: [],
        weekly: [],
        monthly: [],
    };

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthsOfYear = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    entries.forEach((entry) => {
        // DAILY
        entry.daily.forEach(d => {
            const dateObj = new Date(d.date);
            const dayName = daysOfWeek[dateObj.getDay()];

            groupedData.daily.push({
                day: dayName,
                date: d.date,
                chatbot: d.chatbot,
                voice: d.voice
            });
        });

        // WEEKLY
        entry.weekly.forEach(w => {
            const weekStartDate = new Date(w.weekStart);
            const weekDay = weekStartDate.getDate();
            const weekNumber = Math.ceil(weekDay / 7);
            const label = `Week-${weekNumber}`;

            groupedData.weekly.push({
                week: label,
                date: w.weekStart.split('T')[0],
                chatbot: w.chatbot,
                voice: w.voice
            });
        });

        // MONTHLY
        entry.monthly.forEach(m => {
            const monthStartDate = new Date(m.monthStart);
            const monthLabel = monthsOfYear[monthStartDate.getMonth()];

            groupedData.monthly.push({
                month: monthLabel,
                date: m.monthStart.slice(0, 7),
                chatbot: m.chatbot,
                voice: m.voice
            });
        });
    });

    return groupedData;
}

// Individual Content of File Data Schema (Extracted Text + Embeddings)
const fileDataSchema = new mongoose.Schema({
    name: String,
    url: String,
    filepath: String,
    filePathHash: String,
    type: String,
    rating: Number,
    uploadedAt: Date,
    extractedText: String,
    embedding: {
        type: [Number], // For vector search
        index: true,
        required: true
    },
    usernameHash: String // To associate with user
})

// Basic File Info Stored in User Schema
const fileSchema = new mongoose.Schema({
    name: String,
    url: String,
    filepath: String,
    filePathHash: String,
    type: String,
    rating: Number,
    uploadedAt: Date,
});

// User Data Schema
const UserSchema = new mongoose.Schema({
    name: String,
    username: { type: String, unique: true },
    usernameHash: { type: String, unique: true },
    email: { type: String, unique: true },
    emailHash: { type: String, unique: true },
    password: String,
    dob: Date,
    gender: String,
    verified: { type: Boolean, default: false },
    premiumuser: { type: Boolean, default: false },
    premiumDetails: {
        type: [{
            type: {
                type: String, // Plan name
            },
            timestamp: {
                type: String,   // Time of purchase
            }
        }],
        default: []
    },
    profileImageUrl: String,
    expoNotificationToken: String,
    aipromptscount: { type: Number, default: 0 },
    myfiles: { type: [fileSchema], default: [] }
});

const Analytics = new mongoose.Schema(
    {
        username: { type: String, required: true, unique: true },
        usernameHash: { type: String, unique: true },
        daily: [{
            date: String, // YYYY-MM-DD
            chatbot: { type: Number, default: 0 },
            voice: { type: Number, default: 0 }
        }],
        weekly: [{
            weekStart: String, // YYYY-MM-DD
            chatbot: { type: Number, default: 0 },
            voice: { type: Number, default: 0 }
        }],
        monthly: [{
            monthStart: String, // YYYY-MM-DD
            chatbot: { type: Number, default: 0 },
            voice: { type: Number, default: 0 }
        }]
    }
);


// Otp Schema
const OtpSchema = new mongoose.Schema({
    emailHash: { type: String, required: true },         // For lookup (hashed email)
    encryptedEmail: { type: String, required: false },   // For optional storage/display
    otp: { type: String, required: true },               // The OTP code
    createdAt: { type: Date, default: Date.now, expires: 300 } // Auto-expire after 5 minutes
});

// Collection Models of User, FileData, OTP
const User = mongoose.model('User', UserSchema);
const FileData = mongoose.model('FileData', fileDataSchema);
const AnalyticsDashboard = mongoose.model('Analytics', Analytics);
const Otp = mongoose.model('Otp', OtpSchema);

// JWT Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Access token missing' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Razorpay Integration
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Creating a Payment Order
app.post("/create-order", async (req, res) => {
    try {
        const { amount } = req.body;

        const options = {
            amount: amount * 100,
            currency: "INR",
            receipt: `rcptid_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);
        res.json({ success: true, order }); // Optional: send encrypted username back if needed
    } catch (err) {
        console.error("Order creation failed:", err);
        res.status(500).json({ success: false, error: "Order creation failed" });
    }
});

// Verifying the Payments
app.post("/verify-payment", async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        username,
        planName,
        premiumTime
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

    if (expectedSignature === razorpay_signature) {
        const hashedUsername = hashValues(username);
        const encryptedPlanName = encrypt(planName);

        const user = await User.findOne({ usernameHash: hashedUsername });

        if (!user) {
            return res.status(400).json({ message: "User doesn't exist!" });
        }

        await User.updateOne(
            { usernameHash: hashedUsername },
            {
                $set: { premiumuser: true },
                $push: {
                    premiumDetails: {
                        type: encryptedPlanName,
                        timestamp: premiumTime
                    }
                }
            }
        );

        return res.json({ success: true, message: "Payment verified successfully" });
    } else {
        return res.status(400).json({ success: false, message: "Payment verification failed" });
    }
});


// User Token Validation for Automatic Login
app.get('/validate-user', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const decryptedUser = {
            name: decryptSafe(user.name),
            username: decryptSafe(user.username),
            email: decryptSafe(user.email),
            dob: user.dob,
            gender: decryptSafe(user.gender),
            verified: user.verified,
            premiumuser: user.premiumuser,
            profileImageUrl: decryptSafe(user.profileImageUrl),
            expoNotificationToken: decryptSafe(user.expoNotificationToken),
            aipromptscount: user.aipromptscount,
            myfiles: Array.isArray(user.myfiles)
                ? user.myfiles.map(file => ({
                    name: decryptSafe(file.name),
                    url: decryptSafe(file.url),
                    filepath: decryptSafe(file.filepath),
                    type: file.type,
                    rating: file.rating,
                    uploadedAt: file.uploadedAt
                }))
                : [],
            premiumDetails: Array.isArray(user.premiumDetails)
                ? user.premiumDetails.map(prem => ({
                    type: decryptSafe(prem.type),
                    timestamp: prem.timestamp
                }))
                : []
        };

        const dashboardDoc = await AnalyticsDashboard.findOne({ usernameHash: hashValues(decryptSafe(user.username)) });
        const dashboard = dashboardDoc ? formatAnalyticsData([dashboardDoc]) : {
            daily: [],
            weekly: [],
            monthly: []
        };

        res.status(200).json({ decryptedUser, dashboard });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(401).json({ message: 'Unauthorized Access' });
    }
});

// Get the Statistics of the Dashboard
app.get('/stats/:username', async (req, res) => {
    try {
        const { username } = req.params;

        if (!username) {
            return res.status(400).json({ message: 'Username is required.' });
        }

        const hashedUsername = hashValues(username);
        const userStats = await AnalyticsDashboard.find({ usernameHash: hashedUsername });

        // Initialize groupedData
        const groupedData = {
            daily: [],
            weekly: [],
            monthly: [],
        };

        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const monthsOfYear = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        userStats.forEach((entry) => {
            // DAILY
            entry.daily.forEach(d => {
                const dateObj = new Date(d.date);
                const dayName = daysOfWeek[dateObj.getDay()];

                groupedData.daily.push({
                    day: dayName,
                    date: d.date,
                    chatbot: d.chatbot,
                    voice: d.voice
                });
            });

            // WEEKLY
            entry.weekly.forEach(w => {
                const weekStartDate = new Date(w.weekStart);
                const weekDay = weekStartDate.getDate(); // e.g. 10
                const weekNumber = Math.ceil(weekDay / 7); // 1–5
                const weekLabel = `Week-${weekNumber}`;
                const label = `${weekLabel}`;

                groupedData.weekly.push({
                    week: label, // "Week-2
                    date: w.weekStart.split('T')[0],
                    chatbot: w.chatbot,
                    voice: w.voice
                });
            });

            // MONTHLY
            entry.monthly.forEach(m => {
                const monthStartDate = new Date(m.monthStart);
                const monthLabel = monthsOfYear[monthStartDate.getMonth()]; // e.g. "April"

                groupedData.monthly.push({
                    month: monthLabel, // "April"
                    date: m.monthStart.slice(0, 7), // e.g., "2025-04"
                    chatbot: m.chatbot,
                    voice: m.voice
                });
            });
        });


        return res.json(groupedData);
    } catch (error) {
        console.error('Error in /stats/:username', error);
        res.status(500).json({ message: 'Error fetching analytics', error });
    }
});



// Updates the Dashboard
app.patch('/update-dashboard', async (req, res) => {
    try {
        const { username, chatbot = 0, voice = 0 } = req.body;
        if (!username) return res.status(400).json({ error: 'Username is required' });

        const hashedUsername = hashValues(username);

        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekStr = weekStart.toISOString().split('T')[0];
        const monthStr = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

        // Step 1: Find or create the main doc
        let doc = await AnalyticsDashboard.findOne({ usernameHash: hashedUsername });
        if (!doc) {
            doc = await AnalyticsDashboard.create({
                username: encrypt(username),
                usernameHash: hashedUsername,
                daily: [{ date: dateStr, chatbot, voice }],
                weekly: [{ weekStart: weekStr, chatbot, voice }],
                monthly: [{ monthStart: monthStr, chatbot, voice }]
            });
            return res.json({ message: 'Stats created' });
        }

        // Step 2: Helper to increment or insert
        const incrementOrInsert = (arr, key, matchKey, chatbot, voice) => {
            const index = arr.findIndex(item => item[matchKey] === key);
            if (index >= 0) {
                arr[index].chatbot += chatbot;
                arr[index].voice += voice;
            } else {
                const newItem = { [matchKey]: key, chatbot, voice };
                arr.push(newItem);
            }
        };

        incrementOrInsert(doc.daily, dateStr, 'date', chatbot, voice);
        incrementOrInsert(doc.weekly, weekStr, 'weekStart', chatbot, voice);
        incrementOrInsert(doc.monthly, monthStr, 'monthStart', chatbot, voice);

        await doc.save();
        res.json({ message: 'Stats updated' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});



// Singup or Creating a new account
app.post('/signup', async (req, res) => {
    const {
        name,
        username,
        email,
        password,
        dob,
        gender,
        expoNotificationToken,
        profileImageUrl
    } = req.body;

    if (!password) {
        return res.status(400).json({ success: false, message: 'Password is required' });
    }

    try {
        // Encrypt the email for uniqueness check
        const encryptedEmail = encrypt(email);
        const hashEmail = hashValues(email)
        const existingUser = await User.findOne({ email: hashEmail });

        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: encrypt(name),
            username: encrypt(username),
            usernameHash: hashValues(username),
            email: encryptedEmail,
            emailHash: hashEmail,
            password: hashedPassword,
            dob: dob,
            gender: encrypt(gender),
            verified: true,
            profileImageUrl: encrypt(profileImageUrl),
            expoNotificationToken: encrypt(expoNotificationToken)
        });

        await newUser.save();
        res.json({ success: true, message: 'Signup successful' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Signup failed' });
    }
});


// Sending OTP
app.post('/send-otp', async (req, res) => {
    const { email } = req.body;
    const otp = crypto.randomInt(100000, 999999).toString();
    const emailHash = hashValues(email);
    const encryptedEmail = encrypt(email);

    try {
        await Otp.deleteMany({ emailHash });
        await new Otp({ emailHash, encryptedEmail, otp }).save();

        // SendGrid mail config (similar to nodemailer format)
        const msg = {
            to: email,
            from: process.env.EMAIL_USER, // must be a verified sender in SendGrid
            subject: '🔐 Your OTP Code from QuickDocs App',
            text: `Your QuickDocs OTP is ${otp}. This OTP is valid for 5 minutes.`,
            html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e2e2; border-radius: 10px; padding: 30px 40px; background-color: #fdfdfd;">
                <div style="text-align: center; margin-bottom: 25px;">
                    <h2 style="margin: 0; color: #2e6ddf;">QuickDocs Verification</h2>
                    <p style="font-size: 15px; color: #555;">One-Time Password (OTP)</p>
                </div>
                <div style="text-align: center; margin: 40px 0;">
                    <p style="font-size: 16px; color: #333; margin-bottom: 10px;">
                        Use the following OTP to complete your verification:
                    </p>
                    <div style="font-size: 32px; font-weight: bold; color: #2e6ddf; letter-spacing: 3px;">
                        ${otp}
                    </div>
                    <p style="font-size: 14px; color: #777; margin-top: 10px;">
                        This OTP is valid for <strong>5 minutes</strong>.
                    </p>
                </div>
                <hr style="border: none; border-top: 1px solid #e2e2e2; margin: 30px 0;" />
                <div style="text-align: center;">
                    <p style="font-size: 13px; color: #999;">
                        If you didn't request this OTP, you can safely ignore this email.
                    </p>
                    <p style="font-size: 13px; color: #999;">
                        Need help? Contact us at
                        <a href="mailto:quickdocss@gmail.com" style="color: #2e6ddf;">
                            quickdocss@gmail.com
                        </a>
                    </p>
                </div>
                <div style="text-align: center; font-size: 12px; color: #bbb; margin-top: 30px;">
                    <p>© ${new Date().getFullYear()} QuickDocs Inc. All rights reserved.</p>
                </div>
            </div>
            `
        };

        await sgMail.send(msg);

        res.json({ success: true, message: 'OTP sent successfully' });

    } catch (error) {
        console.error('SendGrid Error:', error);
        res.status(500).json({ success: false, message: 'Error sending OTP' });
    }
});


// Verifying OTP
app.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    const emailHash = hashValues(email);

    const otpRecord = await Otp.findOne({ emailHash, otp });

    if (!otpRecord) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    await Otp.deleteMany({ emailHash });

    res.json({ success: true, message: 'OTP verified successfully' });
});


// Check if user exists by email
app.post('/check-user-exists', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    try {
        const hashedEmail = hashValues(email);
        const user = await User.findOne({ emailHash: hashedEmail });
        res.status(200).json({ exists: !!user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Resetting the Password
app.post('/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    const hashedEmail = hashValues(email);

    try {
        const user = await User.findOne({ emailHash: hashedEmail });

        if (!user) {
            return res.status(400).json({ message: "Email doesn't exist!" });
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.password);

        if (isSamePassword) {
            return res.status(409).json({ message: "This password is already used. Please choose a new one." });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await User.findOneAndUpdate({ emailHash: hashedEmail }, { password: hashed });

        return res.status(200).json({ message: 'Password reset successful.' });

    } catch (error) {
        console.error('Reset Password Error:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});


// Updating the Expo Notification Token
app.post('/update-notification-token', async (req, res) => {
    const { expoNotificationToken, username } = req.body;
    const hashedUsername = hashValues(username);
    const encryptedExpoNotificationToken = encrypt(expoNotificationToken)

    try {
        const user = await User.findOne({ usernameHash: hashedUsername });

        if (!user) {
            return res.status(400).json({ message: "User doesn't exist!" });
        }

        await User.updateOne(
            { usernameHash: hashedUsername },
            { $set: { expoNotificationToken: encryptedExpoNotificationToken } }
        );

        return res.status(200).json({ message: 'Notification Token Updated Successfully' });

    } catch (error) {
        console.error('Error updating notification token:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});


//Embeddings Conversion
async function generateEmbedding(text) {
    const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GOOGLE_CLOUD_API}`,
        {
            content: { parts: [{ text }] },
            taskType: 'RETRIEVAL_QUERY'
        },
        {
            headers: { 'Content-Type': 'application/json' }
        }
    );

    return response.data?.embedding?.values || [];
}


async function callGeminiWithRetry(payload, model = "gemini-2.5-pro", retries = 5) {
    let delay = 500;

    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${process.env.GOOGLE_CLOUD_API}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }
            );

            // Retry only on 503 / 5xx
            if (res.status >= 500) {
                throw new Error(`Server error: ${res.status}`);
            }

            const data = await res.json();
            return data;

        } catch (err) {
            if (i === retries - 1) throw err;

            console.warn(`Retry ${i + 1} for ${model}...`);
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
        }
    }
}

async function generateWithFallback(payload) {
    try {
        // Primary: Gemini 2.5 Pro
        return await callGeminiWithRetry(payload, "gemini-2.5-pro");
    } catch (err) {
        console.warn("⚠️ Pro failed, switching to Flash model...");

        return await callGeminiWithRetry(payload, "gemini-2.5-flash");
    }
}

// AI RESPONSE
app.post('/ask', async (req, res) => {
    const { question, username, detectedLanguage } = req.body;
    if (!question || !username) return res.status(400).json({ message: 'Missing fields' });

    console.log(`Question: ${question}`);
    console.log(`Detected Language: ${detectedLanguage}`);

    try {
        const lowerQuestion = question.toLowerCase();

        // Map detected language code to name for prompt
        const langMap = {
            'en-IN': 'English',
            'te-IN': 'Telugu',
            'hi-IN': 'Hindi',
            'bn-IN': 'Bengali',
            'kn-IN': 'Kannada',
            'ml-IN': 'Malayalam',
            'mr-IN': 'Marathi',
            'od-IN': 'Odia',
            'pa-IN': 'Punjabi',
            'sa-IN': 'Sanskrit',
            'ta-IN': 'Tamil',
            'ur-IN': 'Urdu',
            'as-IN': 'Assamese',
            'gu-IN': 'Gujarati',
            'kok-IN': 'Konkani',
            'ks-IN': 'Kashmiri',
            'mai-IN': 'Maithili',
            'mni-IN': 'Manipuri',
            'ne-IN': 'Nepali',
            'ne-NP': 'Nepali',
            'sd-IN': 'Sindhi',
            'si-LK': 'Sinhala',
            'bho-IN': 'Bhojpuri',
            'doi-IN': 'Dogri',
            'brx-IN': 'Bodo',
            'sat-IN': 'Santali'
        };

        const targetLang = detectedLanguage ? (langMap[detectedLanguage] || 'English') : 'the same language as the Question';

        // check general prompts
        const generalPrompts = [
            /who\s+(are|r)\s+you/,
            /what\s+can\s+you\s+do/,
            /who\s+is\s+your\s+(creator|inventor|developer)/,
            /thank\s+you/,
            /you\s+(are|r)\s+(awesome|great|good|amazing|smart|helpful)/,
            /hi\b|hello\b|hey\b/
        ];

        const isGeneralQuestion = generalPrompts.some(pattern => pattern.test(lowerQuestion));

        let topMatches = '';
        const hashedUsername = hashValues(username)

        if (!isGeneralQuestion) {
            // Fetch encrypted embeddings from DB (assume embeddings stored encrypted)
            // decrypt embeddings before using
            const queryEmbedding = await generateEmbedding(question);

            const userDocs = await FileData.find({ usernameHash: hashedUsername });

            const scoredDocs = userDocs.map(doc => {
                let score = 0;
                if (doc.embedding && queryEmbedding && doc.embedding.length === queryEmbedding.length) {
                    for (let i = 0; i < queryEmbedding.length; i++) {
                        score += queryEmbedding[i] * doc.embedding[i];
                    }
                }
                return { doc, score };
            });

            // Sort descending by score and pick top 3
            scoredDocs.sort((a, b) => b.score - a.score);
            const topResults = scoredDocs.slice(0, 3).map(m => m.doc);

            console.log("Top results count:", topResults.length);

            // decrypt extractedText if stored encrypted
            topMatches = topResults
                .map(doc => {
                    console.log(decryptSafe(doc.extractedText))
                    return decryptSafe(doc.extractedText) || '';
                })
                .filter(Boolean)
                .join('\n---\n');
        }

        console.log("Targetted Language: ", targetLang)

        const systemContext = topMatches || 'No user files matched. Use only your personality and app knowledge.';

        const prompt = `You are a helpful assistant named Agent QD created by N R Yadav that gives responses based on the files uploaded by the user. You are integrated in a Mobile Application called Quick Docs. Quick Docs App is an Intelligent File Management mobile solution that securely stores important files while providing an AI-powered chatbot for quick summarization and answers. Always answer the questions that you are answering to them, Make sure you are always Agent QD not the user.
Follow these instructions carefully:
- College id Card number is same as the Roll Number
- Don't give data in table, but always give data in Text format
- Always respond in **${targetLang}**
- Use natural, conversational tone
- Keep it simple and friendly
- If you don't understand, say so politely in ${targetLang}
- Avoid markdown formatting
- Make sure to answer clearly and directly
- Never Generalise the Answers, If the information is from the User Data, then only answer based on that, else say that you don't have the information.

Context:
${systemContext}

Question: ${lowerQuestion}`;

        const payload = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }]
                }
            ]
        };

        const data = await generateWithFallback(payload);

        console.log(data)
        console.log(process.env.GOOGLE_CLOUD_API)

        const answer =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "Sorry, Due to Poor Internet Connection, I couldn't fetch the answer. Please try again.";

        console.log(`Answer in ${targetLang}:`, answer);

        // encrypt answer before sending to DB if saving (optional)
        // but here we just send plain text back to frontend
        res.json({ answer });
    } catch (err) {
        console.error('Ask route error:', err);
        res.status(500).json({ message: 'Something went wrong', error: err.message });
    }
});



// Check Prompt Limitation of User
app.post('/check-prompt-limitation', async (req, res) => {
    const { username } = req.body;
    const hashedUsername = hashValues(username)

    try {
        const user = await User.findOne({ usernameHash: hashedUsername });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Decrypt plan types before checking
        const planNames = user.premiumDetails.map(p => {
            try {
                return decryptSafe(p.type || '');
            } catch (e) {
                console.error('Error decrypting plan type:', e);
                return ''; // fallback
            }
        });


        let allowedPrompts = 3;
        if (planNames.some(name => name.includes('Ultra Pro Max'))) allowedPrompts = Infinity;
        else if (planNames.some(name => name.includes('Ultra Pro'))) allowedPrompts = 25;
        else if (planNames.some(name => name.includes('Pro'))) allowedPrompts = 10;

        if (user.aipromptscount >= allowedPrompts) {
            return res.status(403).json({ message: 'Prompt limit reached' });
        }

        user.aipromptscount += 1;
        await user.save();

        res.json({ message: 'Prompt allowed', updatedPromptCount: user.aipromptscount });
    } catch (err) {
        console.error('Error updating prompt count:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// Comprehensive language configuration for Indian languages (if Needed)
const INDIAN_LANGUAGES = [
    'hi-IN',    // Hindi
    'te-IN',    // Telugu  
    'kn-IN',    // Kannada
    'ta-IN',    // Tamil
    'mr-IN',    // Marathi
    'bn-IN',    // Bengali
    'gu-IN',    // Gujarati
    'ml-IN',    // Malayalam
    'pa-IN',    // Punjabi
    'ur-IN',    // Urdu
    'as-IN',    // Assamese
    'or-IN',    // Odia
    'ne-NP',    // Nepali
    'si-LK',    // Sinhala
];

const translateWithGoogleCloud = async (text, sourceLang, targetLang = 'en', projectId) => {
    try {
        const location = 'global'; // or specific location like 'us-central1'
        const parent = `projects/${projectId}/locations/${location}`;

        // Map language codes from Speech-to-Text format to Translation API format
        const langMap = {
            'en-IN': 'en',
            'te-IN': 'te',
        };

        const mappedSourceLang = langMap[sourceLang] || sourceLang.split('-')[0];

        const request = {
            parent: parent,
            contents: [text],
            mimeType: 'text/plain',
            sourceLanguageCode: mappedSourceLang,
            targetLanguageCode: targetLang,
        };

        const [response] = await translateClient.translateText(request);

        if (response.translations && response.translations.length > 0) {
            return {
                translatedText: response.translations[0].translatedText,
                detectedLanguage: response.translations[0].detectedLanguageCode || mappedSourceLang,
                confidence: 1.0, // Google Cloud Translation API doesn't provide confidence scores
                service: 'Google Cloud Translation'
            };
        }

        throw new Error('No translation result received');
    } catch (error) {
        console.error('Google Cloud Translation error:', error);
        throw error;
    }
};

// Enhanced language detection using Google Cloud Translation
const detectLanguageWithGoogleCloud = async (text, projectId) => {
    try {
        const location = 'global';
        const parent = `projects/${projectId}/locations/${location}`;

        const request = {
            parent: parent,
            content: text,
            mimeType: 'text/plain',
        };

        const [response] = await translateClient.detectLanguage(request);

        if (response.languages && response.languages.length > 0) {
            // Return the most confident detection
            const bestDetection = response.languages.reduce((best, current) =>
                current.confidence > best.confidence ? current : best
            );

            return {
                languageCode: bestDetection.languageCode,
                confidence: bestDetection.confidence
            };
        }

        return null;
    } catch (error) {
        console.error('Language detection error:', error);
        return null;
    }
};

// Advanced speech-to-text with Sarvam AI
app.post("/speech-to-text-app", upload.single("audio"), async (req, res) => {
    try {
        console.log("Starting Sarvam AI Speech-to-Text Transcribe...");

        // Ensure we have a file
        if (!req.file) {
            return res.status(400).json({
                error: "No audio file provided",
                transcript: "",
                detectedLanguage: "unknown"
            });
        }

        // Convert the buffer to an object that Sarvam SDK can process
        // We simulate a Readable property using pass-through or Buffer
        const audioBuffer = req.file.buffer;

        // Pass the raw buffer directly. We need to construct a custom object for core.file.Uploadable
        // using fs or directly passing as Buffer with metadata if supported.
        const fileObj = {
            data: audioBuffer,
            filename: req.file.originalname || 'audio.mp3',
            contentType: req.file.mimetype || 'audio/mp3',
        };

        const response = await sarvamClient.speechToText.transcribe({
            file: fileObj,
            model: 'saaras:v3',
            mode: 'transcribe',  // This outputs spoken text in its original language, with numerals formatted
            // language_code: 'unknown' (can be omitted for auto-detection in Saaras v3)
        });

        if (response.transcript) {
            console.log(`Detected Language: ${response.language_code}`);
            console.log("Transcript:", response.transcript);

            let translationInfo = {
                originalLanguage: response.language_code || 'en-IN',
                originalText: response.transcript,
                wasTranslated: false, // In transcribe mode it is not translated to English
                confidence: response.language_probability || 1.0,
                service: 'Sarvam AI Speech-to-Text Transcribe (Transcribe mode)'
            };

            res.json({
                transcript: response.transcript,
                detectedLanguage: response.language_code || 'en-IN',
                confidence: response.language_probability || 1.0,
                translationInfo: translationInfo,
                success: true,
                originalText: response.transcript,
                service: 'Sarvam AI'
            });
        } else {
            return res.status(400).json({
                error: "No speech detected",
                transcript: "",
                detectedLanguage: "unknown"
            });
        }

    } catch (err) {
        console.error("Sarvam AI speech recognition error:", err);
        res.status(500).json({
            error: "Sarvam AI speech recognition failed",
            transcript: "",
            detectedLanguage: "unknown",
            details: err.message,
            service: "Sarvam AI"
        });
    }
});

// Advanced speech-to-text with Google Cloud Translation
app.post("/speech-to-text-web-v2", upload.single("audio"), async (req, res) => {
    try {
        const projectId = process.env.GOOGLE_PROJECT_ID; // Replace with your actual project ID
        const audioBytes = req.file.buffer.toString("base64");
        const audio = { content: audioBytes };

        console.log("Starting advanced language detection and recognition...");

        // Enhanced language list for better coverage
        const languagesToTest = [
            'en-IN',    // English (India)
            'te-IN',    // Telugu (India)
        ];

        // Enhanced recognition with better configuration
        const recognitionPromises = languagesToTest.map(async (langCode) => {
            try {
                const config = {
                    encoding: 'WEBM_OPUS',
                    sampleRateHertz: 48000,
                    languageCode: langCode,
                    enableAutomaticPunctuation: true,
                    enableWordConfidence: true,
                    enableWordTimeOffsets: true,
                    model: 'latest_long',
                    useEnhanced: true, // Use enhanced model for better accuracy
                    maxAlternatives: 3, // Get multiple alternatives
                    profanityFilter: false,
                    enableSpeakerDiarization: false,
                    metadata: {
                        interactionType: 'VOICE_SEARCH',
                        industryNaicsCodeOfAudio: 518210, // Data processing
                        microphoneDistance: 'NEARFIELD',
                        originalMediaType: 'AUDIO',
                        recordingDeviceType: 'SMARTPHONE'
                    }
                };

                const [response] = await speechClient.recognize({
                    audio: audio,
                    config: config,
                });

                if (response.results && response.results.length > 0) {
                    const result = response.results[0];
                    const alternative = result.alternatives[0];

                    // Calculate enhanced confidence score
                    const wordConfidences = alternative.words?.map(word => word.confidence) || [];
                    const avgWordConfidence = wordConfidences.length > 0
                        ? wordConfidences.reduce((sum, conf) => sum + conf, 0) / wordConfidences.length
                        : alternative.confidence || 0;

                    return {
                        language: langCode,
                        transcript: alternative.transcript,
                        confidence: alternative.confidence || 0,
                        avgWordConfidence: avgWordConfidence,
                        wordCount: alternative.transcript.split(' ').length,
                        alternatives: result.alternatives.slice(1, 3), // Additional alternatives
                        words: alternative.words || []
                    };
                }
                return null;
            } catch (error) {
                console.log(`Recognition failed for ${langCode}:`, error.message);
                return null;
            }
        });

        // Wait for all recognitions to complete
        const results = await Promise.all(recognitionPromises);
        const validResults = results.filter(result => result !== null);

        if (validResults.length === 0) {
            return res.status(400).json({
                error: "No speech detected in any language",
                transcript: "",
                detectedLanguage: "unknown",
                service: "Google Cloud Speech-to-Text"
            });
        }

        // Enhanced scoring algorithm for best result selection
        const bestResult = validResults.reduce((best, current) => {
            // Enhanced scoring with multiple factors
            const currentScore = (
                current.confidence * 0.4 +
                current.avgWordConfidence * 0.3 +
                (current.wordCount > 0 ? 0.2 : 0) +
                (current.transcript.length > 10 ? 0.1 : 0)
            );

            const bestScore = (
                best.confidence * 0.4 +
                best.avgWordConfidence * 0.3 +
                (best.wordCount > 0 ? 0.2 : 0) +
                (best.transcript.length > 10 ? 0.1 : 0)
            );

            return currentScore > bestScore ? current : best;
        });

        console.log(`Best match: ${bestResult.language} with confidence ${bestResult.confidence}`);
        console.log("Original Text:", bestResult.transcript);

        let finalTranscript = bestResult.transcript;
        let translationInfo = {
            originalLanguage: bestResult.language,
            originalText: bestResult.transcript,
            wasTranslated: false,
            confidence: bestResult.confidence,
            avgWordConfidence: bestResult.avgWordConfidence,
            service: 'Google Cloud Speech-to-Text',
            allResults: validResults.map(r => ({
                language: r.language,
                transcript: r.transcript,
                confidence: r.confidence
            }))
        };

        // Translate using Google Cloud Translation API if needed
        if (bestResult.language !== 'en-IN' && bestResult.transcript.trim()) {
            try {
                console.log("Starting Google Cloud Translation...");

                // First, detect language confidence using Translation API
                const languageDetection = await detectLanguageWithGoogleCloud(
                    bestResult.transcript,
                    projectId
                );

                if (languageDetection) {
                    console.log(`Language detection: ${languageDetection.languageCode} (confidence: ${languageDetection.confidence})`);
                }

                // Translate using Google Cloud Translation API
                const translationResult = await translateWithGoogleCloud(
                    bestResult.transcript,
                    bestResult.language,
                    'en',
                    projectId
                );

                if (translationResult && translationResult.translatedText) {
                    finalTranscript = translationResult.translatedText;
                    translationInfo.wasTranslated = true;
                    translationInfo.translationService = translationResult.service;
                    translationInfo.detectedLanguageByTranslation = translationResult.detectedLanguage;

                    console.log('Translation successful with Google Cloud:', translationResult.translatedText);
                } else {
                    console.log('Translation returned empty result');
                }

            } catch (translateError) {
                console.error("Google Cloud Translation failed:", translateError);

                // Fallback: keep original text but log the failure
                translationInfo.translationError = translateError.message;
                translationInfo.translationService = 'Failed - Google Cloud Translation';
            }
        }

        // Enhanced response with more detailed information
        res.json({
            transcript: finalTranscript,
            detectedLanguage: bestResult.language,
            confidence: bestResult.confidence,
            avgWordConfidence: bestResult.avgWordConfidence,
            wordCount: bestResult.wordCount,
            translationInfo: translationInfo,
            success: true,
            originalText: bestResult.transcript,
            service: 'Google Cloud Speech-to-Text + Translation',
            processingDetails: {
                languagesTestedCount: languagesToTest.length,
                validResultsCount: validResults.length,
                bestResultScore: bestResult.confidence,
                hasWordLevelData: bestResult.words.length > 0
            }
        });

    } catch (err) {
        console.error("Google Cloud speech recognition error:", err);
        res.status(500).json({
            error: "Google Cloud speech recognition failed",
            transcript: "",
            detectedLanguage: "unknown",
            details: err.message,
            service: "Google Cloud Speech-to-Text"
        });
    }
});


// Advanced and Updated speech-to-text endpoint with free translation
app.post("/speech-to-text-web", upload.single("audio"), async (req, res) => {
    try {
        const audioBytes = req.file.buffer.toString("base64");
        const audio = { content: audioBytes };

        console.log("Starting parallel language detection...");

        // Test multiple languages in parallel   

        const languagesToTest = ['en-US', 'en-IN', 'te-IN'];

        const recognitionPromises = languagesToTest.map(async (langCode) => {
            try {
                const config = {
                    encoding: 'WEBM_OPUS',
                    sampleRateHertz: 48000,
                    languageCode: langCode,
                    enableAutomaticPunctuation: true,
                    enableWordConfidence: true,
                    model: 'latest_long',
                };

                const [response] = await speechClient.recognize({
                    audio: audio,
                    config: config,
                });

                if (response.results && response.results.length > 0) {
                    const result = response.results[0];
                    const alternative = result.alternatives[0];

                    return {
                        language: langCode,
                        transcript: alternative.transcript,
                        confidence: alternative.confidence || 0,
                        wordCount: alternative.transcript.split(' ').length
                    };
                }
                return null;
            } catch (error) {
                console.log(`Recognition failed for ${langCode}:`, error.message);
                return null;
            }
        });

        // Wait for all recognitions to complete
        const results = await Promise.all(recognitionPromises);
        const validResults = results.filter(result => result !== null);

        if (validResults.length === 0) {
            return res.status(400).json({
                error: "No speech detected in any language",
                transcript: "",
                detectedLanguage: "unknown"
            });
        }

        // Find the best result based on confidence and transcript length
        const bestResult = validResults.reduce((best, current) => {
            const currentScore = current.confidence * (current.wordCount > 0 ? 1 : 0.5);
            const bestScore = best.confidence * (best.wordCount > 0 ? 1 : 0.5);
            return currentScore > bestScore ? current : best;
        });

        console.log(`Best match: ${bestResult.language} with confidence ${bestResult.confidence}`);

        let finalTranscript = bestResult.transcript;
        let translationInfo = {
            originalLanguage: bestResult.language,
            originalText: bestResult.transcript,
            wasTranslated: false,
            confidence: bestResult.confidence,
            allResults: validResults
        };

        // Translate if needed using free APIs
        if (bestResult.language !== 'en-IN' && bestResult.transcript.trim()) {
            try {
                const langCode = bestResult.language.split('-')[0];

                // Map language codes for different APIs
                const langMap = {
                    'te': 'te'
                };

                const sourceLang = langMap[langCode] || langCode;

                // Try multiple translation services in order of preference
                let translationResults = [];

                // Try Google Free (most reliable)
                try {
                    const translatedText = await translateWithGoogleFree(bestResult.transcript, sourceLang, 'en');
                    translationResults.push({
                        service: 'Google Free',
                        text: translatedText,
                        score: 10 // Highest priority
                    });
                    console.log('Translation successful with Google Free:', translatedText);
                } catch (googleError) {
                    console.log('Google Free failed:', googleError.message);
                }

                // Try Lingva (good alternative)
                try {
                    const translatedText = await translateWithLingva(bestResult.transcript, sourceLang, 'en');
                    translationResults.push({
                        service: 'Lingva',
                        text: translatedText,
                        score: 8
                    });
                    console.log('Translation successful with Lingva:', translatedText);
                } catch (lingvaError) {
                    console.log('Lingva failed:', lingvaError.message);
                }

                // Choose the best translation based on quality heuristics
                let bestTranslation = null;

                if (translationResults.length > 0) {
                    // Filter out obviously bad translations
                    const validTranslations = translationResults.filter(result =>
                        result.text &&
                        result.text.length > 0 &&
                        result.text !== bestResult.transcript && // Not same as original
                        !result.text.includes('Translation Error') &&
                        result.text.length >= bestResult.transcript.length * 0.3 // Not too short
                    );

                    if (validTranslations.length > 1) {
                        // Compare translations and choose best one
                        bestTranslation = validTranslations.reduce((best, current) => {
                            let currentScore = current.score;
                            let bestScore = best.score;

                            // Bonus for longer, more detailed translations
                            if (current.text.length > best.text.length * 1.2) {
                                currentScore += 2;
                            }

                            // Bonus for proper capitalization and punctuation
                            if (current.text.match(/^[A-Z]/) && current.text.match(/[.!?]$/)) {
                                currentScore += 1;
                            }

                            // Penalty for all caps or no caps
                            if (current.text === current.text.toUpperCase() ||
                                current.text === current.text.toLowerCase()) {
                                currentScore -= 2;
                            }

                            return currentScore > bestScore ? current : best;
                        });

                        console.log('Multiple translations available:');
                        validTranslations.forEach(t => console.log(`${t.service}: "${t.text}"`));
                        console.log(`Chose ${bestTranslation.service} as best translation`);

                    } else if (validTranslations.length === 1) {
                        bestTranslation = validTranslations[0];
                    }
                }

                let translatedText = bestTranslation ? bestTranslation.text : null;

                if (translatedText) {
                    finalTranscript = translatedText;
                    translationInfo.wasTranslated = true;
                }

            } catch (translateError) {
                console.error("Translation failed:", translateError);
            }
        }

        res.json({
            transcript: finalTranscript,
            detectedLanguage: bestResult.language,
            confidence: bestResult.confidence,
            translationInfo: translationInfo,
            success: true
        });

    } catch (err) {
        console.error("Parallel recognition error:", err);
        res.status(500).json({
            error: "Parallel speech recognition failed",
            transcript: "",
            detectedLanguage: "unknown",
            details: err.message
        });
    }
});



// Route to convert Text to Speech with Sarvam AI
app.post('/text-to-speech', async (req, res) => {
    // Note: Sarvam AI language codes typically differ slightly from Google's. Ensure frontend sends the correct format like 'hi-IN'.
    const { text, languageCode } = req.body;

    try {
        console.log(`Starting Sarvam AI TTS for language: ${languageCode}`);

        // Sarvam has a 500 character limit per request. Split text if needed.
        const maxLength = 480;
        const chunks = [];
        let remaining = text;

        while (remaining.length > 0) {
            if (remaining.length <= maxLength) {
                chunks.push(remaining);
                break;
            }
            // Find a good breaking point (punctuation or space)
            let breakPoint = maxLength;
            const segment = remaining.substring(0, maxLength);
            const lastPunctuation = Math.max(
                segment.lastIndexOf('.'),
                segment.lastIndexOf('!'),
                segment.lastIndexOf('?'),
                segment.lastIndexOf('\n')
            );

            if (lastPunctuation > maxLength * 0.5) {
                breakPoint = lastPunctuation + 1; // Include punctuation
            } else {
                const lastSpace = segment.lastIndexOf(' ');
                if (lastSpace > maxLength * 0.5) {
                    breakPoint = lastSpace;
                }
            }

            chunks.push(remaining.substring(0, breakPoint).trim());
            remaining = remaining.substring(breakPoint).trim();
        }

        console.log(`Text split into ${chunks.length} chunks`);

        const audioBuffers = [];

        // Process chunks sequentially to maintain order and avoid rate limits
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            if (!chunk) continue;

            console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
            const response = await sarvamClient.textToSpeech.convert({
                inputs: [chunk],
                target_language_code: languageCode || 'te-IN',
                speaker: 'ritu', // standard speaker format for Sarvam TTS. Other options depend on model
                pace: 1.0,
                speech_sample_rate: 16000,
                enable_preprocessing: true,
                model: 'bulbul:v3'
            });

            if (response && response.audios && response.audios.length > 0) {
                // Convert base64 audio to buffer
                const audioBuffer = Buffer.from(response.audios[0], 'base64');
                audioBuffers.push(audioBuffer);
            } else {
                console.warn(`Sarvam TTS Warning: No audio content returned for chunk ${i + 1}`);
            }
        }

        if (audioBuffers.length > 0) {
            // Because Sarvam usually returns WAV audio without a complex header, simple buffer concatenation
            // works decently well. For pure seamlessness, proper WAV stripping would be needed, 
            // but for basic stitching this is acceptable.
            // A more robust approach would be to strip the 44-byte WAV header from chunks after the first.

            // Basic header stripping for chunks > 0 assuming standard 44 byte WAV header
            let finalBuffer;
            if (audioBuffers.length === 1) {
                finalBuffer = audioBuffers[0];
            } else {
                let totalLength = audioBuffers[0].length;
                for (let i = 1; i < audioBuffers.length; i++) {
                    totalLength += (audioBuffers[i].length - 44);
                }

                finalBuffer = Buffer.alloc(totalLength);
                let offset = 0;

                // Copy first chunk fully
                audioBuffers[0].copy(finalBuffer, offset);
                offset += audioBuffers[0].length;

                // Copy remaining chunks without 44-byte header
                for (let i = 1; i < audioBuffers.length; i++) {
                    audioBuffers[i].copy(finalBuffer, offset, 44);
                    offset += (audioBuffers[i].length - 44);
                }

                // Update file size in the main header (bytes 4-7)
                finalBuffer.writeUInt32LE(totalLength - 8, 4);
                // Update data chunk size (bytes 40-43)
                finalBuffer.writeUInt32LE(totalLength - 44, 40);
            }

            const combinedBase64 = finalBuffer.toString('base64');
            res.json({
                audioContent: combinedBase64
            });
        } else {
            console.error('Sarvam TTS Error: No audio content generated across all chunks');
            res.status(500).json({ error: 'Failed to generate combined audio content' });
        }
    } catch (err) {
        console.error('TTS Error:', err.message);
        res.status(500).json({ error: 'Failed to generate audio' });
    }
});

// Helper function to add rate limiting for free APIs
const rateLimiter = {
    lastCall: {},
    minInterval: 1000, // 1 second between calls

    async waitIfNeeded(apiName) {
        const now = Date.now();
        const lastCall = this.lastCall[apiName] || 0;
        const timeSinceLastCall = now - lastCall;

        if (timeSinceLastCall < this.minInterval) {
            const waitTime = this.minInterval - timeSinceLastCall;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastCall[apiName] = Date.now();
    }
};


// Check Username Uniqueness (case-insensitive)
app.post('/check-username', async (req, res) => {
    const { username } = req.body;

    try {
        const hashedUsername = hashValues(username)

        // Because username encrypted, case-insensitive regex won't work directly.
        // Instead, fetch all and decrypt or store lowercased encrypted usernames separately for indexing/search.
        // For simplicity, here is a naive approach:
        const users = await User.findOne({ usernameHash: hashedUsername });

        if (users) {
            return res.status(409).json({ exists: true });
        }

        return res.status(200).json({ exists: false });
    } catch (error) {
        console.error('Error checking username:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Check If User Exists (exact match)
app.post('/check-valid-user', async (req, res) => {
    const { username } = req.body;

    try {
        const trimmedUserName = username.trim();
        const hashedUsername = hashValues(trimmedUserName)

        const users = await User.findOne({ usernameHash: hashedUsername });

        if (!users) {
            return res.status(404).json({ exists: false });
        }

        return res.status(200).json({ exists: true });
    } catch (error) {
        console.error('Error checking user existence:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Login Route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(username, password)

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        // Hash the username to find the user
        const trimmedUserName = username.trim();
        const usernameHash = hashValues(trimmedUserName);
        const user = await User.findOne({ usernameHash: usernameHash });

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        console.log(isMatch)
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Decrypt user fields
        const decryptedUser = {
            name: decryptSafe(user.name),
            username: decryptSafe(user.username),
            email: decryptSafe(user.email),
            dob: user.dob,
            gender: decryptSafe(user.gender),
            verified: user.verified,
            premiumuser: user.premiumuser,
            profileImageUrl: decryptSafe(user.profileImageUrl),
            expoNotificationToken: decryptSafe(user.expoNotificationToken),
            aipromptscount: user.aipromptscount,
            myfiles: user.myfiles.map(file => ({
                name: decryptSafe(file.name),
                url: decryptSafe(file.url),
                filepath: decryptSafe(file.filepath),
                type: file.type,
                rating: file.rating,
                uploadedAt: file.uploadedAt
            })),
            premiumDetails: user.premiumDetails.map(prem => ({
                type: decryptSafe(prem.type),
                timestamp: prem.timestamp
            }))
        };

        // 🔍 Get dashboard data
        const dashboardDoc = await AnalyticsDashboard.findOne({ usernameHash: usernameHash });
        const dashboard = dashboardDoc ? formatAnalyticsData([dashboardDoc]) : {
            daily: [],
            weekly: [],
            monthly: []
        };

        const token = jwt.sign(
            { id: user._id, email: decryptedUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({ message: 'Login successful', token, user: decryptedUser, dashboard });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error Bro' });
    }
});



// Deactivation of account
app.delete('/deactivate', async (req, res) => {
    const { email, username } = req.body;

    if (!email || !username) {
        return res.status(400).json({ success: false, message: 'Email and username are required' });
    }

    try {
        const hashedUsername = hashValues(username);
        const hashedEmail = hashValues(email);

        const [files] = await bucket.getFiles({ prefix: `${username}/` });

        // Delete files from GCS
        if (files.length > 0) {
            await Promise.all(files.map(file => file.delete()));
        }

        // Delete user by encrypted email
        const user = await User.findOneAndDelete({ emailHash: hashedEmail });
        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }

        // Delete all FileData documents by encrypted username (assuming FileData usernames are also encrypted)
        const deleteFileDataResult = await FileData.deleteMany({ usernameHash: hashedUsername });
        console.log(`Deleted ${deleteFileDataResult.deletedCount} FileData documents from ${username}'s Account`);

        res.json({ success: true, message: 'GCS data, DB Data and File Data deleted successfully' });
    } catch (error) {
        console.error('Error during deactivation:', error);
        res.status(500).json({ success: false, message: 'Account deletion failed' });
    }
});



// Generating GCS presigned URL for File Uploads
app.post('/generate-upload-url', async (req, res) => {
    const { fileName, fileType, username } = req.body;

    if (!fileName || !fileType || !username) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const extension = fileType.toLowerCase();
    const timestamp = Date.now();
    const gcsKey = `${username}/profile-${timestamp}.${extension}`;
    const file = bucket.file(gcsKey);

    try {
        const [uploadUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 60 * 60 * 1000,
            contentType: `image/${fileType}`,
        });

        await deleteOldProfiles(username);

        const imageUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${gcsKey}`;

        console.log(imageUrl)

        res.json({ success: true, uploadUrl, imageUrl });
    } catch (err) {
        console.error("Error generating signed URL:", err);
        res.status(500).json({ success: false, message: "Failed to generate upload URL" });
    }
});

// Delete old profile images (if any)
async function deleteOldProfiles(username) {
    const [files] = await bucket.getFiles({ prefix: `${username}/profile-` });
    for (const file of files) {
        await file.delete();
    }
}


// File Object-id and Details sending API
app.post('/file-data-thrower', async (req, res) => {
    const { username, itemname } = req.body;

    try {
        // Encrypt username for querying
        const hashedUsername = hashValues(username);

        // Find user by encrypted username
        const user = await User.findOne({ usernameHash: hashedUsername });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Find file by decrypting each file name and matching with itemname from frontend (plain text)
        const file = user.myfiles.find(f => decryptSafe(f.name) === itemname);
        if (!file) {
            return res.status(404).json({ message: 'File not found.' });
        }

        // Decrypt file fields before sending
        const fileId = file._id;
        const fileUrl = decryptSafe(file.url);
        const fileType = file.type; // assuming type is not sensitive
        console.log(file)

        res.json({ fileId, fileUrl, fileType });
    } catch (err) {
        console.error('Error in /file-data-thrower:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
});


// DELETE /:fileId?username=<username>
app.delete('/:fileId', async (req, res) => {
    const { fileId } = req.params;
    const { username } = req.query;

    if (!username) {
        return res.status(400).json({ message: 'User Name is required.' });
    }

    const hashedUsername = hashValues(username)

    try {
        // Find user by ID (assuming userId is MongoDB _id, no encryption needed)
        const user = await User.findOne({ usernameHash: hashedUsername });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const file = user.myfiles.id(fileId);
        if (!file) {
            return res.status(404).json({ message: 'File not found.' });
        }

        // Decrypt filepath before deleting from GCS
        const gcsFilePath = decryptSafe(file.filepath);

        try {
            await bucket.file(gcsFilePath).delete();
            console.log(`Deleted from GCS: ${gcsFilePath}`);
        } catch (gcsErr) {
            console.error('GCS deletion error:', gcsErr);
            return res.status(502).json({ message: 'Failed to delete file from storage.' });
        }

        // Remove file from user's myfiles
        user.myfiles.pull(fileId);
        await user.save();

        // Delete corresponding FileData document (assuming filepath is stored encrypted there too)

        try {
            const fileDataDeleteResult = await FileData.deleteOne({ filePathHash: hashValues(decryptSafe(file.filepath)) });
            console.log('FileData deletion:', fileDataDeleteResult);
        } catch (err) {
            console.error('FileData deletion error:', err);
        }

        const decryptedUser = {
            name: decryptSafe(user.name),
            username: decryptSafe(user.username),
            email: decryptSafe(user.email),
            dob: user.dob,
            gender: decryptSafe(user.gender),
            verified: user.verified,
            premiumuser: user.premiumuser,
            profileImageUrl: decryptSafe(user.profileImageUrl),
            expoNotificationToken: decryptSafe(user.expoNotificationToken),
            aipromptscount: user.aipromptscount,
            myfiles: user.myfiles.map(file => ({
                name: decryptSafe(file.name),
                url: decryptSafe(file.url),
                filepath: decryptSafe(file.filepath),
                type: file.type,
                rating: file.rating,
                uploadedAt: file.uploadedAt
            })),
            premiumDetails: user.premiumDetails.map(prem => ({
                type: decryptSafe(prem.type),
                timestamp: prem.timestamp
            }))
        };

        return res.json({ message: 'File deleted successfully.', updatedUser: decryptedUser });
    } catch (err) {
        console.error('Delete file error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});


// Uploading of File Route
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        let { importance, originalname, username } = req.body;

        if (!file || !originalname || !username || !importance) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const hashedUsername = hashValues(username);
        const modifiedOriginalName = originalname.replace(/\s+/g, '_')
        const fileName = Date.now() + '-' + modifiedOriginalName;
        const gcsKey = `${username}/${fileName}`;
        const gcsFile = bucket.file(gcsKey);

        const stream = gcsFile.createWriteStream({
            metadata: {
                contentType: file.mimetype
            }
        });

        stream.on('error', (err) => {
            console.error('Stream error:', err);
            return res.status(500).json({ message: 'Upload failed', error: err.message });
        });

        stream.on('finish', async () => {
            try {
                const fileUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${gcsKey}`;

                // Detect file type
                const { fileTypeFromBuffer } = await import('file-type');
                const detected = await fileTypeFromBuffer(file.buffer);
                const ext = detected?.ext || originalname.split('.').pop().toLowerCase();

                let extractedText = '';

                if (ext === 'pdf') {
                    try {
                        const pdfData = await pdfParse(file.buffer);
                        extractedText = (pdfData.text || '').trim();
                        console.log("PDF Extracted Data (text layer):", extractedText);
                    } catch (err) {
                        console.error('PDF parse error:', err.message);
                        extractedText = '';
                    }

                    // If pdf-parse returned nothing, the PDF is image-based (scanned) — fall back to Gemini OCR
                    if (!extractedText) {
                        console.log('PDF has no text layer. Falling back to Gemini OCR...');
                        try {
                            const pdfBase64 = file.buffer.toString('base64');
                            const geminiOcrRes = await fetch(
                                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_CLOUD_API}`,
                                {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        contents: [{
                                            role: 'user',
                                            parts: [
                                                {
                                                    inline_data: {
                                                        mime_type: 'application/pdf',
                                                        data: pdfBase64
                                                    }
                                                },
                                                {
                                                    text: 'Extract and return ALL text content from this PDF exactly as it appears. Include every word, number, and character. Do not summarize, interpret, or add any commentary — just return the raw text content.'
                                                }
                                            ]
                                        }]
                                    })
                                }
                            );
                            const geminiOcrData = await geminiOcrRes.json();
                            extractedText = geminiOcrData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                            console.log("PDF OCR (Gemini) Extracted Data:", extractedText);
                        } catch (geminiErr) {
                            console.error('Gemini OCR for PDF error:', geminiErr.message);
                            extractedText = '[PDF text could not be extracted]';
                        }
                    }
                } else if (ext === 'docx') {
                    try {
                        const result = await mammoth.extractRawText({ buffer: file.buffer });
                        extractedText = result.value || '';
                        console.log("DOCX Extracted Data" + extractedText)
                    } catch (err) {
                        console.error('DOCX parse error:', err.message);
                        extractedText = '[DOCX text could not be extracted]';
                    }
                } else {
                    try {
                        const [imageResult] = await client.textDetection(`gs://${process.env.GCS_BUCKET_NAME}/${gcsKey}`);
                        const detections = imageResult?.textAnnotations || [];
                        extractedText = detections.length > 0 ? detections[0].description : '';
                        console.log("Image Text Data" + extractedText)
                    } catch (err) {
                        console.error('Vision API error:', err.message);
                        extractedText = '[Image OCR failed]';
                    }
                }

                const combinedText = `${originalname}\n${extractedText}`;
                const embedding = await generateEmbedding(combinedText);

                const newFile = {
                    name: encrypt(originalname),
                    url: encrypt(fileUrl),
                    filepath: encrypt(gcsKey),
                    filePathHash: hashValues(gcsKey),
                    type: file.mimetype,
                    rating: parseInt(importance),
                    uploadedAt: new Date(),
                };

                await User.findOneAndUpdate(
                    { usernameHash: hashedUsername },
                    { $push: { myfiles: newFile } }
                );

                const newFileDoc = new FileData({
                    ...newFile,
                    extractedText: encrypt(combinedText),
                    embedding,
                    usernameHash: hashedUsername
                });

                await newFileDoc.save();

                res.status(200).json({
                    message: 'File uploaded and saved successfully',
                    file: {
                        ...newFile,
                        name: originalname,
                        url: fileUrl,
                        filepath: gcsKey
                    }
                });

            } catch (err) {
                console.error('Post-upload error:', err);
                res.status(500).json({ message: 'Failed to finalize upload', error: err.message });
            }
        });

        stream.end(file.buffer);

    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ message: 'Upload failed', error: err.message });
    }
});


// Basic Slash Route
app.get('/', (req, res) => {
    res.send(`
      <html>
        <head>
          <title>QuickDocs Backend</title>
          <style>
            body {
              background: #f5f7fa;
              font-family: 'Segoe UI', sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .container {
              text-align: center;
              background: white;
              padding: 40px;
              border-radius: 16px;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            h1 {
              color: #3b82f6;
              font-size: 32px;
            }
            p {
              color: #6b7280;
              font-size: 18px;
              margin-top: 10px;
            }
            .emoji {
              font-size: 48px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="emoji">🔐</div>
            <h1>QuickDocs Backend Server</h1>
            <p>✅ Backend is Running Smoothly</p>
          </div>
        </body>
      </html>
    `);
});


// Starting Point of our server with local port as 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));