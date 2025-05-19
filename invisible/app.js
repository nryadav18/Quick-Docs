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
const path = require('path')
const { Readable } = require('stream')
const axios = require('axios')
const app = express();
const Razorpay = require("razorpay");
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();
const AES_SECRET_KEY = process.env.AES_SECRET_KEY;
const IV_LENGTH = 16;


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const storage = new Storage({
    keyFilename: path.join(__dirname, './yadavmainserver-firebase.json'),
    projectId: 'yadavmainserver',
});
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
const upload = multer({ storage: multer.memoryStorage() });


// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("MongoDB error:", err));


function encrypt(text) {
    if (!text) return text;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(AES_SECRET_KEY), iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return iv.toString('base64') + ':' + encrypted;
}

function decrypt(encrypted) {
    const [ivBase64, encryptedText] = encrypted.split(':');
    const iv = Buffer.from(ivBase64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(AES_SECRET_KEY), iv);
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

function hashValues(email) {
    return crypto.createHash('sha256').update(email).digest('hex');
}



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


const fileSchema = new mongoose.Schema({
    name: String,
    url: String,
    filepath: String,
    filePathHash: String,
    type: String,
    rating: Number,
    uploadedAt: Date,
});


// User Schema
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


const OtpSchema = new mongoose.Schema({
    emailHash: { type: String, required: true },         // For lookup (hashed email)
    encryptedEmail: { type: String, required: false },   // For optional storage/display
    otp: { type: String, required: true },               // The OTP code
    createdAt: { type: Date, default: Date.now, expires: 300 } // Auto-expire after 5 minutes
});

const User = mongoose.model('User', UserSchema);
const FileData = mongoose.model('FileData', fileDataSchema);
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

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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


// app.get('/user/:id', authenticateToken, async (req, res) => {
//     const { id } = req.params;

//     if (req.user.id !== id) {
//         return res.status(403).json({ message: 'Access denied' });
//     }

//     try {
//         const user = await User.findById(id).select('-password');
//         if (!user) return res.status(404).json({ message: 'User not found' });

//         // Decrypt fields
//         const decryptedUser = {
//             ...user._doc,
//             username: decrypt(user.username),
//             email: decrypt(user.email),
//             premiumDetails: user.premiumDetails.map(p => ({
//                 type: decrypt(p.type),
//                 timestamp: p.timestamp
//             }))
//         };

//         res.status(200).json(decryptedUser);
//     } catch (error) {
//         console.error('Error fetching user data:', error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });


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


//Send OTP
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
                    <p style="font-size: 13px; color: #999;">Need help? Contact us at <a href="mailto:support@quickdocs.com" style="color: #2e6ddf;">support@quickdocs.com</a></p>
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


// Verify OTP
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

// Reset Password
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


// Update Expo Notification Token
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
            { $set: { encryptedExpoNotificationToken } }
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
        `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
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


//AI RESPONSE
app.post('/ask', async (req, res) => {
    const { question, username } = req.body;
    if (!question || !username) return res.status(400).json({ message: 'Missing fields' });
    console.log(question, username)
    try {
        const lowerQuestion = question.toLowerCase();

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

            // decrypt extractedText if stored encrypted
            topMatches = results
                .map(doc => {
                    return decrypt(doc.extractedText) || '';
                })
                .filter(Boolean)
                .join('\n---\n');
        }

        const systemContext = topMatches || 'No user files matched. Use only your personality and app knowledge.';

        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{
                                text: `You are a helpful assistant named Agent QD created by N R Yadav that gives responses based on the files uploaded by the user. You are integrated in a Mobile Application called Quick Docs. Quick Docs App is an Intelligent File Management mobile solution that securely stores important files while providing an AI-powered chatbot for quick summarization and answers. Context:\n\n${systemContext}\n\nQuestion: ${question}`
                            }]
                        }
                    ]
                })
            }
        );

        const data = await geminiRes.json();

        const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No meaningful response.';

        // encrypt answer before sending to DB if saving (optional)
        // but here we just send plain text back to frontend
        res.json({ answer });
    } catch (err) {
        console.error('Ask route error:', err);
        res.status(500).json({ message: 'Something went wrong', error: err.message });
    }
});



// Check Prompt Limitation
app.post('/check-prompt-limitation', async (req, res) => {
    const { username } = req.body;
    const hashedUsername = hashValues(username)

    try {
        const user = await User.findOne({ usernameHash : hashedUsername });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.premiumuser) {
            return res.status(403).json({ message: 'Not a premium user' });
        }

        // Decrypt plan types before checking
        const planNames = user.premiumDetails.map(p => {
            try {
                return decrypt(p.type || '');
            } catch (e) {
                console.error('Error decrypting plan type:', e);
                return ''; // fallback
            }
        });


        let allowedPrompts = 3;
        if (planNames.some(name => name.includes('Ultra Pro Max'))) allowedPrompts = Infinity;
        else if (planNames.some(name => name.includes('Ultra Pro'))) allowedPrompts = 10;

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


// Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        // Hash the username to find the user
        const usernameHash = hashValues(username);
        const user = await User.findOne({ usernameHash });

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        if (!user.verified) {
            return res.status(403).json({ message: 'Email not verified' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Decrypt user fields
        const decryptedUser = {
            name: decrypt(user.name),
            username: decrypt(user.username),
            email: decrypt(user.email),
            dob: user.dob,
            gender: decrypt(user.gender),
            verified: user.verified,
            premiumuser: user.premiumuser,
            profileImageUrl: decrypt(user.profileImageUrl),
            expoNotificationToken: decrypt(user.expoNotificationToken),
            aipromptscount: user.aipromptscount,
            myfiles: user.myfiles.map(file => ({
                name: decrypt(file.name),
                url: decrypt(file.url),
                filepath: decrypt(file.filepath),
                type: file.type,
                rating: file.rating,
                uploadedAt: file.uploadedAt
            })),
            premiumDetails: user.premiumDetails.map(prem => ({
                type: decrypt(prem.type),
                timestamp: prem.timestamp
            }))
        };


        const token = jwt.sign(
            { id: user._id, email: decryptedUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ message: 'Login successful', token, user: decryptedUser });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});



// Deactivate account
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



// Generate GCS presigned URL
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
            contentType: `image/${fileType}`
        });

        await deleteOldProfiles(username);

        const imageUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${gcsKey}`;

        res.json({ success: true, uploadUrl, imageUrl });
    } catch (err) {
        console.error("Error generating signed URL:", err);
        res.status(500).json({ success: false, message: "Failed to generate upload URL" });
    }
});

// Delete old profile images
async function deleteOldProfiles(username) {
    const [files] = await bucket.getFiles({ prefix: `${username}/profile-` });
    for (const file of files) {
        await file.delete();
    }
}


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
        const file = user.myfiles.find(f => decrypt(f.name) === itemname);
        if (!file) {
            return res.status(404).json({ message: 'File not found.' });
        }

        // Decrypt file fields before sending
        const fileId = file._id;
        const fileUrl = decrypt(file.url);
        const fileType = file.type; // assuming type is not sensitive

        res.json({ fileId, fileUrl, fileType });
    } catch (err) {
        console.error('Error in /file-data-thrower:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
});



// DELETE /:fileId?userId=<userId>
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
        const gcsFilePath = decrypt(file.filepath);
        console.log('Deleting GCS file:', gcsFilePath);

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
            const fileDataDeleteResult = await FileData.deleteOne({ filepathHash: hashValues(decrypt(file.filepath)) });
            console.log('FileData deletion:', fileDataDeleteResult);
        } catch (err) {
            console.error('FileData deletion error:', err);
        }

        // Decrypt user fields before sending updated user back
        user.username = decrypt(user.username);
        // Optionally decrypt other sensitive user fields here

        return res.json({ message: 'File deleted successfully.', updatedUser: user });
    } catch (err) {
        console.error('Delete file error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});


// Upload route
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        let { importance, originalname, username } = req.body;
        if (!file || !originalname || !username || !importance) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Encrypt username for DB queries/storage
        const hashedUsername = hashValues(username);

        // Generate unique file name and GCS key using plain username (safe for GCS path)
        const fileName = Date.now() + '-' + originalname;
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
                const [result] = await client.textDetection(`gs://${process.env.GCS_BUCKET_NAME}/${gcsKey}`);
                const detections = result.textAnnotations;
                const extractedText = detections.length > 0 ? detections[0].description : '';

                const embedding = await generateEmbedding(extractedText);

                // Encrypt sensitive file fields before saving to DB
                const newFile = {
                    name: encrypt(originalname),
                    url: encrypt(fileUrl),
                    filepath: encrypt(gcsKey),
                    filePathHash: hashValues(gcsKey),
                    type: file.mimetype,
                    rating: parseInt(importance),
                    uploadedAt: new Date(),
                };

                // Update User by encrypted username
                const user = await User.findOneAndUpdate(
                    { usernameHash: hashedUsername },
                    { $push: { myfiles: newFile } }
                );

                const newFileDoc = new FileData({
                    name: encrypt(originalname),
                    url: encrypt(fileUrl),
                    filepath: encrypt(gcsKey),
                    filePathHash: hashValues(gcsKey),
                    type: file.mimetype,
                    rating: parseInt(importance) || 1,
                    uploadedAt: new Date(),
                    extractedText: encrypt(extractedText),
                    embedding,
                    usernameHash: hashedUsername
                });

                await newFileDoc.save();

                // Send decrypted data back to frontend (use original plain text)
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
            <div class="emoji">🚀</div>
            <h1>QuickDocs Backend Server</h1>
            <p>✅ Running smoothly on port ${PORT}</p>
          </div>
        </body>
      </html>
    `);
});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
