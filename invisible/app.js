require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { Storage } = require('@google-cloud/storage');
const multer = require('multer')
const fs = require('fs')
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const path = require('path')
const axios = require('axios')
const { SpeechClient } = require('@google-cloud/speech').v1;
const app = express();
const Razorpay = require("razorpay");
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();
const AES_SECRET_KEY = Buffer.from(process.env.AES_SECRET_KEY, 'base64');
if (AES_SECRET_KEY.length !== 32) throw new Error('AES key must be 32 bytes');
const IV_LENGTH = 16;
const langs = require('langs');


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const storage = new Storage({
    keyFilename: path.join(__dirname, `${process.env.GOOGLE_APPLICATION_CREDENTIALS}`),
    projectId: `${process.env.GOOGLE_PROJECT_ID}`,
});


const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
const upload = multer({ storage: multer.memoryStorage() });
const speechClient = new SpeechClient();


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

// Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});


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
    const emailHash = hashValues(email); // deterministic key
    const encryptedEmail = encrypt(email); // store encrypted if needed for display

    try {
        await Otp.deleteMany({ emailHash });

        await new Otp({ emailHash, encryptedEmail, otp }).save();

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: '🔐 Your OTP Code from QuickDocs App',
            html: `
            <!-- Email Template remains unchanged -->
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e2e2; border-radius: 10px; padding: 30px 40px; background-color: #fdfdfd;">
                <div style="text-align: center; margin-bottom: 25px;">
                    <h2 style="margin: 0; color: #2e6ddf;">QuickDocs Verification</h2>
                    <p style="font-size: 15px; color: #555;">One-Time Password (OTP)</p>
                </div>
                <div style="text-align: center; margin: 40px 0;">
                    <p style="font-size: 16px; color: #333; margin-bottom: 10px;">Use the following OTP to complete your verification:</p>
                    <div style="font-size: 32px; font-weight: bold; color: #2e6ddf; letter-spacing: 3px;">${otp}</div>
                    <p style="font-size: 14px; color: #777; margin-top: 10px;">This OTP is valid for <strong>5 minutes</strong>.</p>
                </div>
                <hr style="border: none; border-top: 1px solid #e2e2e2; margin: 30px 0;" />
                <div style="text-align: center;">
                    <p style="font-size: 13px; color: #999;">If you didn't request this OTP, you can safely ignore this email.</p>
                    <p style="font-size: 13px; color: #999;">Need help? Contact us at <a href="mailto:quickdocss@gmail.com" style="color: #2e6ddf;">quickdocss@gmail.com</a></p>
                </div>
                <div style="text-align: center; font-size: 12px; color: #bbb; margin-top: 30px;">
                    <p>© ${new Date().getFullYear()} QuickDocs Inc. All rights reserved.</p>
                </div>
            </div>
            `
        });

        res.json({ success: true, message: 'OTP sent successfully' });

    } catch (error) {
        console.error(error);
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
        `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${process.env.GOOGLE_CLOUD_API}`,
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
        };

        const targetLang = langMap[detectedLanguage] || 'English';

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

            const results = await FileData.aggregate([
                {
                    $vectorSearch: {
                        index: 'fileDataIndex',
                        queryVector: queryEmbedding,
                        path: 'embedding',
                        numCandidates: 100,
                        limit: 3
                    }
                },
                { $match: { usernameHash: hashedUsername } }
            ]);

            console.log(results)

            // decrypt extractedText if stored encrypted
            topMatches = results
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

Context:
${systemContext}

Question: ${lowerQuestion}`;

        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${process.env.GOOGLE_CLOUD_API}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{
                                text: prompt
                            }]
                        }
                    ]
                })
            }
        );

        const data = await geminiRes.json();

        console.log(data)
        console.log(process.env.GOOGLE_CLOUD_API)

        const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No meaningful response.';

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


// Option 1: Google Translate (Free, no API key) - Using translate-google npm package
const translateWithGoogleFree = async (text, sourceLang, targetLang = 'en') => {
    try {
        // Simple approach using googletrans API endpoint
        const response = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=' +
            sourceLang + '&tl=' + targetLang + '&dt=t&q=' + encodeURIComponent(text));

        const data = await response.json();
        if (data && data[0] && data[0][0] && data[0][0][0]) {
            return data[0][0][0];
        }
        throw new Error('Google Translate parsing failed');
    } catch (error) {
        console.error('Google Free Translate error:', error);
        throw error;
    }
};

// Option 2: Lingva Translate (Completely free, no API key needed)
const translateWithLingva = async (text, sourceLang, targetLang = 'en') => {
    try {
        const response = await fetch(`https://lingva.ml/api/v1/${sourceLang}/${targetLang}/${encodeURIComponent(text)}`);
        const data = await response.json();
        return data.translation;
    } catch (error) {
        console.error('Lingva error:', error);
        throw error;
    }
};


// Advanced and Updated speech-to-text endpoint with free translation
app.post("/speech-to-text-app", upload.single("audio"), async (req, res) => {
    try {
        const audioBytes = req.file.buffer.toString("base64");
        const audio = { content: audioBytes };

        console.log("Starting parallel language detection...");

        // Test multiple languages in parallel   

        const languagesToTest = ['en-IN', 'te-IN', 'hi-IN'];

        const recognitionPromises = languagesToTest.map(async (langCode) => {
            try {
                const config = {
                    encoding: 'AMR',
                    sampleRateHertz: 8000,
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

        console.log("Original Text: ", bestResult.transcript)

        // Translate if needed using free APIs
        if (bestResult.language !== 'en-IN' && bestResult.transcript.trim()) {
            try {
                const langCode = bestResult.language.split('-')[0];

                // Map language codes for different APIs
                const langMap = {
                    'hi': 'hi',
                    'te': 'te',
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
            success: true,
            originalText: bestResult.transcript
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
                    'hi': 'hi',
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



// Route to convert Text to Speech
app.post('/text-to-speech', async (req, res) => {
    const { text, languageCode, name, ssmlGender, audioEncoding, speakingRate } = req.body;

    try {
        const response = await axios.post(
            `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${process.env.GOOGLE_CLOUD_API}`,
            {
                input: { text },
                voice: {
                    languageCode: languageCode,
                    name: name,
                    ssmlGender: ssmlGender
                },
                audioConfig: {
                    audioEncoding: audioEncoding,
                    speakingRate: speakingRate
                }
            }
        );

        res.json({
            audioContent: response.data.audioContent
        });
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
                        extractedText = pdfData.text || '';
                        console.log("PDF Extracted Data" + extractedText)
                    } catch (err) {
                        console.error('PDF parse error:', err.message);
                        extractedText = '[PDF text could not be extracted]';
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
