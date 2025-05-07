import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button, RadioButton } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import Note from './Note';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ErrorAlert, WarningAlert, SuccessAlert } from "../components/AlertBox"


const SignupScreen = ({ navigation }) => {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [dob, setDob] = useState(null);
    const [gender, setGender] = useState('male');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isOtpVerified, setIsOtpVerified] = useState(false);
    const [imageUri, setImageUri] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

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

    const checkUsernameUnique = async (username) => {
        try {
            const res = await axios.post('https://quick-docs-app-backend.onrender.com/check-username', { username });
            return !res.data.exists;
        } catch (err) {
            return false;
        }
    };

    const validateInputs = async () => {
        if (imageUri == null) {
            showErrorAlert("Invalid Photo", "Please Select your Image to Continue.")
            return false
        }

        if (!name.trim()) {
            showErrorAlert("Empty Name", "Please enter your Full Name to Continue.")
            return false
        }

        if (!username.trim()) {
            showErrorAlert("Empty Username", "Please enter your username to Continue.")
            return false
        }

        if (!/^[a-zA-Z0-9_.-]+$/.test(username.trim())) {
            showErrorAlert("Invalid Username", "Username should contain only A-Z, a-z, 0-9 and _")
            return false
        }

        const isUnique = await checkUsernameUnique(username.trim());
        if (!isUnique) {
            showErrorAlert("Username Already Exist", "Please choose Another Username to Continue.");
            return false
        }

        const trimmedPassword = password.trim()

        if (trimmedPassword.length < 8) {
            showWarningAlert("Weak Password", "Password must be at least 8 characters long.")
            return false
        }

        if (!/[a-z]/.test(trimmedPassword)) {
            showWarningAlert("Weak Password", "Password must contain at least one lowercase letter.")
            return false
        }

        if (!/[A-Z]/.test(trimmedPassword)) {
            showWarningAlert("Weak Password", "Password must contain at least one uppercase letter.")
            return false
        }

        if (!/[0-9]/.test(trimmedPassword)) {
            showWarningAlert("Weak Password", "Password must contain at least one number.")
            return false
        }

        if (!/[!@#$%^&*(),._?":{}|<>]/.test(trimmedPassword)) {
            showWarningAlert("Weak Password", "Password must contain at least one special character.")
            return false
        }

        if (!email.trim()) {
            showErrorAlert("Empty Email", "Please enter your Email to Continue.")
            return false
        }

        if (dob == null) {
            showErrorAlert("Empty DOB", "Please Select your DOB to Continue.")
            return false
        }

        if (!otp.trim()) {
            showErrorAlert("Empty DOB", "Please Select your DOB to Continue.")
            return false
        }

        return true
    }

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const uploadImageAndSignup = async () => {
        try {
            const isValid = await validateInputs();
            if (!isValid) return;

            if (!isOtpVerified) {
                showErrorAlert("Invalid OTP", "Please verify OTP before signing up.");
                return false;
            }

            const trimmedData = {
                name: name.trim(),
                username: username.trim(),
                email: email.trim(),
                password: password.trim(),
                gender: gender.trim(),
                dob: dob ? dob.toISOString() : null
            };

            let profileImageUrl = null;

            if (imageUri) {
                const fileType = imageUri.split('.').pop().toLowerCase();
                const fileName = `profile_${Date.now()}.${fileType}`;

                const res = await axios.post('https://quick-docs-app-backend.onrender.com/generate-upload-url', {
                    fileName,
                    fileType,
                    username: trimmedData.username
                });

                const { uploadUrl, imageUrl } = res.data;
                const image = await fetch(imageUri);
                const blob = await image.blob();

                await fetch(uploadUrl, {
                    method: 'PUT',
                    body: blob,
                    headers: {
                        'Content-Type': `image/${fileType}`
                    }
                });

                profileImageUrl = imageUrl;
            }


            const response = await axios.post('https://quick-docs-app-backend.onrender.com/signup', {
                ...trimmedData,
                profileImageUrl
            });

            if (response.data.success) {
                showSuccessAlert("Signup Success", "Great! Your account has been created!");
                return true;
            } else {
                showErrorAlert("Signup Failed", "Unknown error occurred. Please try again.");
                return false;
            }
        } catch (err) {
            if (err.response?.status === 409) {
                const message = err.response?.data?.message || "Email or Username already exists.";
                showErrorAlert("Signup Conflict", message);
            } else {
                showErrorAlert("Signup Failed", "Signup request failed. Try again later.");
            }
            return false;
        }
    };


    const sendOtp = async () => {
        try {
            const trimmedEmail = email.trim();
            const res = await axios.post('https://quick-docs-app-backend.onrender.com/send-otp', { email: trimmedEmail });
            if (res.data.success) {
                showSuccessAlert("OTP Sent", "Please check out your Inbox for OTP")
                setIsOtpSent(true)
            }
        } catch {
            showErrorAlert("OTP Sending Failed", "Please try again later!")
            return;
        }
    };

    const verifyOtp = async () => {
        try {
            const trimmedEmail = email.trim();
            const trimmedOtp = otp.trim();
            const res = await axios.post('https://quick-docs-app-backend.onrender.com/verify-otp', { email: trimmedEmail, otp: trimmedOtp });
            if (res.data.success) {
                showSuccessAlert("OTP Verified", "OTP Verified Successfully!")
                setIsOtpVerified(true)
            }
        } catch {
            showErrorAlert("Wrong OTP", "Please enter Valid OTP to Continue.")
            return false
        }
    };

    return (
        <LinearGradient colors={["#89f7fe", "#fad0c4"]} style={styles.container}>
            <PaperProvider>
                <SafeAreaView style={styles.safeArea}>
                    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                        <Note />
                        <View style={styles.container}>
                            <Text style={styles.title}>Signup</Text>

                            <View style={styles.imageUploadContainer}>
                                <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                                    {imageUri ? <Image source={{ uri: imageUri }} style={styles.profileImage} /> : <Text>Select Profile Picture</Text>}
                                </TouchableOpacity>
                            </View>

                            <TextInput placeholder="Full Name" style={styles.input} value={name} onChangeText={setName} />
                            <TextInput placeholder="Unique Username" style={styles.input} value={username} onChangeText={setUsername} />
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    placeholder="Password"
                                    style={styles.passwordInput}
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <MaterialCommunityIcons
                                    name={showPassword ? 'eye-off' : 'eye'}
                                    size={24}
                                    color="gray"
                                    style={styles.eyeIcon}
                                    onPress={() => setShowPassword(!showPassword)}
                                />
                            </View>

                            <View style={styles.inputRow}>
                                <TextInput placeholder="Email" style={styles.inputField} value={email} onChangeText={setEmail} />
                                {!isOtpSent && (
                                    <TouchableOpacity style={styles.smallButton} onPress={sendOtp}>
                                        <Text style={styles.buttonText}>Send OTP</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {isOtpSent && (
                                <View style={styles.inputRow}>
                                    <TextInput placeholder="Enter OTP" style={styles.inputField} value={otp} onChangeText={setOtp} keyboardType="numeric" />
                                    <TouchableOpacity style={styles.smallButton} onPress={verifyOtp}>
                                        <Text style={styles.buttonText}>Verify</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            <Button mode="outlined" onPress={() => setShowDatePicker(true)} textColor='#00796b' rippleColor='#00796b' style={styles.datePickerButton}>
                                {dob ? dob.toDateString() : 'Select Date of Birth'}
                            </Button>

                            <DatePickerModal
                                mode="single"
                                visible={showDatePicker}
                                onDismiss={() => setShowDatePicker(false)}
                                date={dob}
                                onConfirm={(params) => {
                                    setShowDatePicker(false);
                                    setDob(params.date);
                                }}
                            />

                            <View style={styles.genderRow}>
                                <Text style={styles.genderLabel}>Select Gender:</Text>
                                <RadioButton.Group onValueChange={setGender} value={gender}>
                                    <View style={styles.radioOption}>
                                        <RadioButton value="male" color='#00796b' />
                                        <Text style={styles.radioLabel}>Male</Text>
                                    </View>
                                    <View style={styles.radioOption}>
                                        <RadioButton value="female" color='#00796b' />
                                        <Text style={styles.radioLabel}>Female</Text>
                                    </View>
                                </RadioButton.Group>
                            </View>

                            <TouchableOpacity style={styles.button} onPress={uploadImageAndSignup}>
                                <Text style={styles.buttonText}>Sign Up</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                <Text style={styles.loginText}>Already have an account? Login</Text>
                            </TouchableOpacity>
                        </View>
                        <ErrorAlert visible={errorAlertVisible} title={errorTitle} message={errorMessage} onOk={() => setErrorAlertVisible(false)} />
                        <WarningAlert visible={warningAlertVisible} title={warningTitle} message={warningMessage} onOk={() => setWarningAlertVisible(false)} onCancel={() => setWarningAlertVisible(false)} />
                        <SuccessAlert visible={successAlertVisible} title={successTitle} message={successMessage} onOk={() => setSuccessAlertVisible(false)} />
                    </ScrollView>
                </SafeAreaView>
            </PaperProvider>
        </LinearGradient >
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    scrollContainer: { flexGrow: 1, justifyContent: 'center' },
    container: { flex: 1, justifyContent: 'center', padding: 10 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
    input: { height: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, marginBottom: 10, borderColor: '#ddd', backgroundColor: '#f9f9f9' },
    inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderRadius: 10, borderColor: '#ddd', backgroundColor: '#f9f9f9' },
    inputField: { flex: 1, paddingHorizontal: 15, height: 50 },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 15,
        backgroundColor: '#f9f9f9'
    },
    passwordInput: {
        flex: 1,
        height: 50,
    },
    eyeIcon: {
        paddingHorizontal: 5,
    },
    smallButton: { backgroundColor: '#00796b', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 5, marginRight: 5 },
    button: { backgroundColor: '#00796b', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    buttonText: { color: 'white', fontWeight: 'bold' },
    loginText: { textAlign: 'center', marginTop: 20 },
    datePickerButton: { marginBottom: 10, padding: 10, borderColor: '#ddd' },
    genderLabel: { fontSize: 16, fontWeight: 'bold', marginVertical: 10 },
    genderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 10
    },
    radioGroup: { flexDirection: 'row', alignItems: 'center' },
    radioOption: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
    radioLabel: { fontSize: 16 },
    imagePicker: { alignItems: 'center', marginBottom: 20, height: 150, width: 150, borderRadius: 75, borderWidth: 1, borderColor: '#00796b', justifyContent: 'center' },
    profileImage: { width: 143, height: 143, borderRadius: 80 },
    imageUploadContainer: { width: '100%', justifyContent: 'center', alignItems: 'center' }
});

export default SignupScreen;
