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


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const storage = new Storage({
    keyFilename: path.join(__dirname, './yadavmainserver-gcs-storage-keys.json'),
    projectId: 'yadavmainserver',
});
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
const upload = multer({ storage: multer.memoryStorage() });



// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("MongoDB error:", err));

const fileSchema = new mongoose.Schema({
    name: String,
    url: String,
    filepath: String,
    type: String,
    rating: Number,
    uploadedAt: Date
});

// User Schema
const UserSchema = new mongoose.Schema({
    name: String,
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    password: String,
    dob: Date,
    gender: String,
    verified: { type: Boolean, default: false },
    premiumuser: { type: Boolean, default: false },
    profileImageUrl: String,
    expoNotificationToken: String,
    myfiles: { type: [fileSchema], default: [] },
    filesdata: [{ type: String }] // Array of strings for extracted text
});


const User = mongoose.model('User', UserSchema);

// OTP Schema
const OtpSchema = new mongoose.Schema({
    email: String,
    otp: String,
    createdAt: { type: Date, default: Date.now, expires: 300 } // Auto-delete after 5 min
});
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

//Payment - Test
// async function generateCashfreeToken(orderId, orderAmount, customerId) {
//     try {
//         const requestBody = {
//             order_id: orderId,
//             order_amount: Number(orderAmount), // ensure it's a number, not string
//             order_currency: 'INR',
//             customer_details: {
//                 customer_id: customerId,
//                 customer_email: 'user@example.com',  // Replace with actual email
//                 customer_phone: '9999999999',       // Replace with actual phone number
//             }
//         };

//         console.log('Request Body:', JSON.stringify(requestBody));

//         const response = await axios.post('https://sandbox.cashfree.com/pg/orders', requestBody, {
//             headers: {
//                 'x-client-id': process.env.CASHFREE_APP_ID,
//                 'x-client-secret': process.env.CASHFREE_SECRET_KEY,
//                 'x-api-version': '2022-09-01', // ✅ required header
//                 'Content-Type': 'application/json',
//             }
//         });

//         console.log('Response:', response.data);
//         return response.data.payment_session_id; // this is the token
//     } catch (error) {
//         console.error('Error generating Cashfree token:', error.response ? error.response.data : error.message);
//         throw new Error('Payment session creation failed');
//     }
// }



// // Create order route
// app.post('/create-order', async (req, res) => {
//     const { amount, planType, customerId } = req.body;

//     try {
//         // Generate the payment session token from Cashfree API
//         const paymentSessionId = await generateCashfreeToken('ORDER127', amount, customerId);

//         // Return the payment session ID (or payment link) to the frontend
//         res.json({ paymentLink: `https://sandbox.cashfree.com/pg/redirect?payment_session_id=${paymentSessionId}` });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: 'Failed to create order' });
//     }
// });

//Payment Link sending via Mail
// async function sendMailToUser(email, paymentLink) {
//     const transporter = nodemailer.createTransport({
//         service: 'gmail',
//         auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_PASS
//         }
//     });

//     const mailOptions = {
//         from: process.env.YOUR_EMAIL,
//         to: email,
//         subject: 'Complete Your Payment',
//         html: `<p>Click the link to complete your payment:</p><a href="${paymentLink}">${paymentLink}</a>`
//     };

//     await transporter.sendMail(mailOptions);
// }

// //Payment - Production
// app.post('/initiate-upi', async (req, res) => {
//     const { order_id, amount, username, email, phone } = req.body;

//     try {
//         const response = await axios.post(
//             'https://api.cashfree.com/pg/orders',
//             {
//                 order_id,
//                 order_amount: amount,
//                 order_currency: 'INR',
//                 customer_details: {
//                     customer_id: username,
//                     customer_email: email,
//                     customer_phone: phone,
//                     customer_name: username
//                 },
//                 order_meta: {
//                     return_url: `https://yourdomain.com/payment-success?order_id=${order_id}`, // for redirect
//                 }
//             },
//             {
//                 headers: {
//                     'x-client-id': process.env.CASHFREE_APP_ID,
//                     'x-client-secret': process.env.CASHFREE_SECRET_KEY,
//                     'x-api-version': '2022-09-01',
//                     'Content-Type': 'application/json'
//                 }
//             }
//         );

//         const { payment_session_id } = response.data;
//         console.log("Cashfree Response:", response.data);

//         const paymentLink = `https://payments.cashfree.com/pg/sessions/${encodeURIComponent(payment_session_id)}`;

//         // send the payment link via email
//         await sendMailToUser(email, paymentLink);

//         res.json({ success: true, paymentLink });
//     } catch (err) {
//         console.error(err.response?.data || err.message);
//         res.status(500).json({ error: 'Failed to create payment link' });
//     }
// });



// Get Payment Status
app.get('/check-status/:order_id', async (req, res) => {
    try {
        const response = await axios.get(
            `https://api.cashfree.com/pg/orders/${req.params.order_id}`,
            {
                headers: {
                    'x-client-id': process.env.CASHFREE_APP_ID,
                    'x-client-secret': process.env.CASHFREE_SECRET_KEY,
                    'x-api-version': '2022-09-01', // ✅ REQUIRED
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json(response.data);
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to check status' });
    }
});


// Get User Data by ID (Secure)
app.get('/user/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    // Ensure user can only access their own data
    if (req.user.id !== id) {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        const user = await User.findById(id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Signup
app.post('/signup', async (req, res) => {
    const { name, username, email, password, dob, gender, expoNotificationToken, profileImageUrl } = req.body;

    if (!password) return res.status(400).json({ success: false, message: 'Password is required' });

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, message: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            username,
            email,
            password: hashedPassword,
            dob,
            gender,
            verified: true,
            profileImageUrl,
            expoNotificationToken : expoNotificationToken
        });

        await newUser.save();
        res.json({ success: true, message: 'Signup successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Signup failed' });
    }
});


// Send OTP
app.post('/send-otp', async (req, res) => {
    const { email } = req.body;
    const otp = crypto.randomInt(100000, 999999).toString();

    try {
        await Otp.deleteMany({ email });
        await new Otp({ email, otp }).save();

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: '🔐 Your OTP Code from QuickDocs App',
            html: `
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
    const otpRecord = await Otp.findOne({ email, otp });

    if (!otpRecord) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    await Otp.deleteMany({ email });
    res.json({ success: true, message: 'OTP verified successfully' });
});

//Check Email
app.post('/check-user-exists', async (req, res) => {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: 'Email is required' });

    try {
        const user = await User.findOne({ email });
        res.status(200).json({ exists: !!user });
    } catch (err) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//Reset-Password
app.post('/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Email doesn't exist!" });
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.password);

        if (isSamePassword) {
            return res.status(409).json({ message: "This password is already used. Please choose a new one." });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await User.findOneAndUpdate({ email }, { password: hashed });

        return res.status(200).json({ message: 'Password reset successful.' });

    } catch (error) {
        console.error('Reset Password Error:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

//Update Expo Notification Token
app.post('/update-notification-token', async (req, res) => {
    const { expoNotificationToken, username } = req.body;

    try {
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(400).json({ message: "User doesn't exist!" });
        }

        await User.updateOne({ expoNotificationToken : expoNotificationToken })

        return res.status(200).json({ message: 'Notification Token Updated Successfully' });

    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
});


//Checking Uniqueness of Username
app.post('/check-username', async (req, res) => {
    try {
        const { username } = req.body;

        const existingUser = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } }).select('_id');

        if (existingUser) {
            return res.status(409).json({ exists: true });
        }

        return res.status(200).json({ exists: false });
    } catch (error) {
        console.error("Error checking username:", error);
        res.status(500).json({ message: "Server error" });
    }
});

//Checking User Exist or Not
app.post('/check-valid-user', async (req, res) => {
    try {
        const { username } = req.body;

        const trimmedUserName = username.trim();

        const existingUser = await User.findOne({ username: trimmedUserName });

        if (!existingUser) {
            return res.status(409).json({ exists: false });
        }

        return res.status(200).json({ exists: true });
    } catch (error) {
        console.error("Error checking username:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const user = await User.findOne({ username });

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

        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ message: 'Login successful', token, user });
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
        const [files] = await bucket.getFiles({ prefix: `${username}/` });

        // Step 1: Delete files from GCS
        if (files.length > 0) {
            await Promise.all(files.map(file => file.delete()));
        }

        // Step 2: Delete user from DB
        const user = await User.findOneAndDelete({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'Account and GCS data deleted successfully' });

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
    const timestamp = Date.now();  // Unique version
    const gcsKey = `${username}/profile-${timestamp}.${extension}`;
    const file = bucket.file(gcsKey);

    try {
        const [uploadUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 60 * 60 * 1000, // 1 hour
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


app.post('/file-id-thrower', async (req, res) => {
    const { username, itemname } = req.body;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
        return res.status(404).json({ message: 'User not found.' });
    }

    // Search for the file in user's myfiles array
    const file = user.myfiles.find(f => f.name === itemname);
    if (!file) {
        return res.status(404).json({ message: 'File not found.' });
    }

    // Return file ID
    res.json({ fileId: file._id });

});


// DELETE /:fileId?userId=<userId>
app.delete('/:fileId', async (req, res) => {
    const { fileId } = req.params;
    const { userId } = req.query;

    console.log('Delete request received:', { fileId, userId });

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const file = user.myfiles.id(fileId);
        if (!file) {
            return res.status(404).json({ message: 'File not found.' });
        }

        const gcsFilePath = file.filepath;
        try {
            await bucket.file(gcsFilePath).delete();
            console.log(`Deleted from GCS: ${gcsFilePath}`);
        } catch (gcsErr) {
            console.error('GCS deletion error:', gcsErr);
            return res.status(502).json({ message: 'Failed to delete file from storage.' });
        }

        // ✅ Remove from MongoDB array
        user.myfiles.pull(fileId);
        await user.save();

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
        const { importance, originalname, username } = req.body;

        if (!file || !originalname || !username || !importance) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Generate unique file name and GCS key
        const fileName = Date.now() + '-' + originalname;
        const gcsKey = `${username}/${fileName}`;
        const gcsFile = bucket.file(gcsKey);

        // Upload to GCS
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

                const newFile = {
                    name: originalname,
                    url: fileUrl,
                    filepath: gcsKey,
                    type: file.mimetype,
                    rating: parseInt(importance) || 1,
                    uploadedAt: new Date()
                };

                const user = await User.findOneAndUpdate(
                    { username },
                    { $push: { myfiles: newFile } },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );

                res.status(200).json({
                    message: 'File uploaded and saved successfully',
                    file: newFile
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
