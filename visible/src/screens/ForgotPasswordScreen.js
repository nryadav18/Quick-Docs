import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { ErrorAlert, WarningAlert, SuccessAlert } from "../components/AlertBox"
import { Ionicons } from '@expo/vector-icons'; // add this to your imports


const ForgotPasswordScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [step, setStep] = useState(1); // Step 1: Email, Step 2: OTP, Step 3: Reset Password
    const [loading, setLoading] = useState(false);
    const [passwordResetDone, setPasswordResetDone] = useState(false);

    //My Custom Alert Boxes
    const [errorAlertVisible, setErrorAlertVisible] = useState(false)
    const [errorTitle, setErrorTitle] = useState("")
    const [errorMessage, setErrorMessage] = useState("")

    const [warningAlertVisible, setWarningAlertVisible] = useState(false)
    const [warningTitle, setWarningTitle] = useState("")
    const [warningMessage, setWarningMessage] = useState("")

    const [successAlertVisible, setSuccessAlertVisible] = useState(false)
    const [successTitle, setSuccessTitle] = useState("")
    const [successMessage, setSuccessMessage] = useState("")

    const [showPassword, setShowPassword] = useState(false); // For toggling password visibility

    //My Custom Alert Functions
    const showErrorAlert = (title, message) => {
        setErrorTitle(title)
        setErrorMessage(message)
        setErrorAlertVisible(true)
    }

    const showWarningAlert = (title, message) => {
        setWarningTitle(title)
        setWarningMessage(message)
        setWarningAlertVisible(true)
    }

    const showSuccessAlert = (title, message) => {
        setSuccessAlertVisible(true)
        setSuccessTitle(title)
        setSuccessMessage(message)
    }

    const API_BASE_URL = 'https://quick-docs-app-backend.onrender.com'; // Replace with your actual backend URL

    // Step 1: Send OTP
    const handleSendOTP = async () => {
        if (!email) {
            showErrorAlert("Empty Email", "Email cannot be Empty!");
            return;
        }

        setLoading(true);
        try {
            // Step 1: Check if email exists in DB
            const checkRes = await axios.post(`${API_BASE_URL}/check-user-exists`, { email });

            if (!checkRes.data.exists) {
                showErrorAlert("User Not Found", "This email is not registered.");
                setLoading(false);
                return;
            }

            // Step 2: Send OTP
            await axios.post(`${API_BASE_URL}/send-otp`, { email });
            showSuccessAlert("OTP Sent", "Please check your Inbox for the OTP.");
            setStep(2);
        } catch (error) {
            showErrorAlert("Server Error", "Please try again later.");
        } finally {
            setLoading(false);
        }
    };


    // Step 2: Verify OTP
    const handleVerifyOTP = async () => {
        if (!otp) {
            showErrorAlert('Empty OTP', "Please Enter the OTP sent to you")
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/verify-otp`, { email, otp });
            showSuccessAlert('OTP Verified', 'You can now create a New Password!')
            setStep(3);
        } catch (error) {
            showErrorAlert('Invalid OTP', 'Please Enter Valid OTP shared with you')
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Reset Password
    const handleResetPassword = async () => {
        if (!newPassword) {
            showErrorAlert("Empty Password", "Password Cannot be Empty!")
            return;
        }

        const trimmedPassword = newPassword.trim()

        if (trimmedPassword.length < 8) {
            showWarningAlert("Weak Password", "Password must be at least 8 characters long.")
            return;
        }

        if (!/[a-z]/.test(trimmedPassword)) {
            showWarningAlert("Weak Password", "Password must contain at least one lowercase letter.")
            return;
        }

        if (!/[A-Z]/.test(trimmedPassword)) {
            showWarningAlert("Weak Password", "Password must contain at least one uppercase letter.")
            return;
        }

        if (!/[0-9]/.test(trimmedPassword)) {
            showWarningAlert("Weak Password", "Password must contain at least one number.")
            return;
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(trimmedPassword)) {
            showWarningAlert("Weak Password", "Password must contain at least one special character.")
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/reset-password`, { email, newPassword });
            setPasswordResetDone(true);
            showSuccessAlert('Successfull', 'Your Password is now Updated')
        } catch (error) {
            showErrorAlert('Invalid Operation', 'Failed to Reset your Password')
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient colors={["#89f7fe", "#fad0c4"]} style={styles.container}>
            <Text style={styles.title}>Forgot Password</Text>

            {step === 1 && (
                <>
                    <TextInput
                        placeholder="Enter your email"
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        placeholderTextColor="#666"
                    />
                    <TouchableOpacity style={styles.button} onPress={handleSendOTP} disabled={loading}>
                        <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
                    </TouchableOpacity>
                </>
            )}

            {step === 2 && (
                <>
                    <TextInput
                        placeholder="Enter OTP"
                        style={styles.input}
                        value={otp}
                        onChangeText={setOtp}
                        keyboardType="numeric"
                        placeholderTextColor="#666"
                    />
                    <TouchableOpacity style={styles.button} onPress={handleVerifyOTP} disabled={loading}>
                        <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify OTP'}</Text>
                    </TouchableOpacity>
                </>
            )}

            {step === 3 && (
                <>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            placeholder="Enter New Password"
                            style={styles.passwordInput}
                            secureTextEntry={!showPassword}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholderTextColor="#666"
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons
                                name={showPassword ? 'eye-off' : 'eye'}
                                size={24}
                                color="gray"
                            />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
                        <Text style={styles.buttonText}>{loading ? 'Resetting...' : 'Reset Password'}</Text>
                    </TouchableOpacity>
                </>
            )}

            <ErrorAlert visible={errorAlertVisible} title={errorTitle} message={errorMessage} onOk={() => setErrorAlertVisible(false)} />
            <WarningAlert visible={warningAlertVisible} title={warningTitle} message={warningMessage} onOk={() => setWarningAlertVisible(false)} onCancel={() => setWarningAlertVisible(false)} />
            <SuccessAlert
                visible={successAlertVisible}
                title={successTitle}
                message={successMessage}
                onOk={() => {
                    setSuccessAlertVisible(false);
                    if (passwordResetDone) {
                        setPasswordResetDone(false); // ✅ Reset the flag
                        navigation.replace('Login');
                    }
                }}
            />
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    input: { height: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, marginBottom: 10 },
    button: { backgroundColor: '#00796b', padding: 15, borderRadius: 10, alignItems: 'center' },
    buttonText: { color: 'white', fontWeight: 'bold' },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 10,
        marginBottom: 10,
        height: 50,
        justifyContent: 'space-between',
    },
    passwordInput: {
        flex: 1,
        height: '100%',
    },

});

export default ForgotPasswordScreen;
