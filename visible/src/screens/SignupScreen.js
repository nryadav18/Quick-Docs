import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button, RadioButton } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign, Entypo } from "@expo/vector-icons"
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ErrorAlert, WarningAlert, SuccessAlert } from "../components/AlertBox"
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from "react-native"
import { BACKEND_URL } from '@env';


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
    const [loading, setLoading] = useState(false)
    const [sendingOTP, setSendingOTP] = useState(false)
    const [verifyingOTP, setVerifyingOTP] = useState(false)
    const [userCreated, setUserCreated] = useState(false)
    const [expoPushToken, setExpoPushToken] = useState('');


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

    useEffect(() => {
        const registerForPushNotificationsAsync = async () => {
            let token;

            if (Device.isDevice) {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                console.log("Existing Permission Status:", existingStatus);
                let finalStatus = existingStatus;

                if (existingStatus !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }

                if (finalStatus !== 'granted') {
                    alert('Failed to get push token for push notification!');
                    return;
                }
                let token;
                try {
                    token = (await Notifications.getExpoPushTokenAsync({
                        projectId : '80585e66-89ca-4d53-8a55-048ccdbf77fd'
                    })).data;
                } catch (error) {
                    console.error("Error fetching push token:", error);
                }

                setExpoPushToken(token);

            } else {
                alert('Must use physical device for Push Notifications');
            }

            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }
        };

        registerForPushNotificationsAsync();
    }, []);

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
            const res = await axios.post(`${BACKEND_URL}/check-username`, { username });
            return !res.data.exists;
        } catch (err) {
            return false;
        }
    };

    const validateInputs = async () => {
        if (imageUri == null) {
            showErrorAlert("Invalid Photo", "Please Select your Image to Continue.")
            setLoading(false)
            return false
        }

        if (!name.trim()) {
            showErrorAlert("Empty Name", "Please enter your Full Name to Continue.")
            setLoading(false)
            return false
        }

        if (!username.trim()) {
            showErrorAlert("Empty Username", "Please enter your username to Continue.")
            setLoading(false)
            return false
        }

        const trimmedUsername = username.trim()

        if (!/^[a-zA-Z0-9_.-]+$/.test(trimmedUsername)) {
            showErrorAlert("Invalid Username", "Username should contain only A-Z, a-z, 0-9 and _")
            setLoading(false)
            return false
        }

        // ✅ Username passed regex, now check uniqueness
        const isUnique = await checkUsernameUnique(trimmedUsername);
        if (!isUnique) {
            showErrorAlert("Username Already Exist", "Please choose Another Username to Continue.");
            setLoading(false)
            return false
        }

        const trimmedPassword = password.trim()

        if (trimmedPassword.length == 0) {
            showErrorAlert("Empty Password", "Please enter your Password to Continue.")
            setLoading(false)
            return false
        }

        if (trimmedPassword.length < 8) {
            showWarningAlert("Weak Password", "Password must be at least 8 characters long.")
            setLoading(false)
            return false
        }

        if (!/[a-z]/.test(trimmedPassword)) {
            showWarningAlert("Weak Password", "Password must contain at least one lowercase letter.")
            setLoading(false)
            return false
        }

        if (!/[A-Z]/.test(trimmedPassword)) {
            showWarningAlert("Weak Password", "Password must contain at least one uppercase letter.")
            setLoading(false)
            return false
        }

        if (!/[0-9]/.test(trimmedPassword)) {
            showWarningAlert("Weak Password", "Password must contain at least one number.")
            setLoading(false)
            return false
        }

        if (!/[!@#$%^&*(),._?":{}|<>]/.test(trimmedPassword)) {
            showWarningAlert("Weak Password", "Password must contain at least one special character.")
            setLoading(false)
            return false
        }

        if (!email.trim()) {
            showErrorAlert("Empty Email", "Please enter your Email to Continue.")
            setLoading(false)
            return false
        }

        if (!otp.trim()) {
            showErrorAlert("Empty OTP", "Please enter your OTP to Continue.")
            setLoading(false)
            return false
        }

        if (dob == null) {
            showErrorAlert("Empty DOB", "Please Select your DOB to Continue.")
            setLoading(false)
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
        setLoading(true)
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
                dob: dob ? dob.toISOString() : null,
                expoNotificationToken : expoPushToken
            };

            let profileImageUrl = null;

            if (imageUri) {
                const fileType = imageUri.split('.').pop().toLowerCase();
                const fileName = `profile_${Date.now()}.${fileType}`;

                const res = await axios.post(`${BACKEND_URL}/generate-upload-url`, {
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


            const response = await axios.post(`${BACKEND_URL}/signup`, {
                ...trimmedData,
                profileImageUrl
            });
            setLoading(false)
            if (response.data.success) {
                showSuccessAlert("Signup Success", "Great! Your account has been created!");
                setUserCreated(true)
                return true;
            } else {
                showErrorAlert("Signup Failed", "Unknown error occurred. Please try again.");
                return false;
            }
        } catch (err) {
            setLoading(false)
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
        setSendingOTP(true)
        try {
            const trimmedEmail = email.trim();
            if (!trimmedEmail) {
                showErrorAlert("Empty Email", "Please enter your Email to Send OTP")
                setSendingOTP(false)
                return;
            }

            const emailExistence = await axios.post(`${BACKEND_URL}/check-user-exists`, { email: trimmedEmail })
            if (emailExistence.data.exists) {
                showErrorAlert("Email already Exists", "A User has been registered with current Email")
                setSendingOTP(false)
                return;
            }


            const res = await axios.post(`${BACKEND_URL}/send-otp`, { email: trimmedEmail });
            if (res.data.success) {
                showSuccessAlert("OTP Sent", "Please check out your Inbox for OTP")
                setIsOtpSent(true)
                setSendingOTP(false)
            }
        } catch {
            showErrorAlert("OTP Sending Failed", "Please try again later!")
            setLoading(false)
            setSendingOTP(false)
            return;
        }
    };

    const verifyOtp = async () => {
        setVerifyingOTP(true)
        try {
            const trimmedEmail = email.trim();
            const trimmedOtp = otp.trim();

            if (!trimmedEmail) {
                showErrorAlert("Empty Email", "Please enter your Email to Send OTP")
                setVerifyingOTP(false)
                return;
            }

            if (!trimmedOtp) {
                showErrorAlert("Empty OTP", "Please enter the OTP sent to your Email")
                setVerifyingOTP(false)
                return;
            }

            const res = await axios.post(`${BACKEND_URL}/verify-otp`, { email: trimmedEmail, otp: trimmedOtp });
            if (res.data.success) {
                showSuccessAlert("OTP Verified", "OTP Verified Successfully!")
                setIsOtpVerified(true)
                setLoading(false)
                setVerifyingOTP(false)
            }
        } catch {
            showErrorAlert("Wrong OTP", "Please enter Valid OTP to Continue.")
            setLoading(false)
            setVerifyingOTP(false)
            return false
        }
    };

    return (
        <LinearGradient colors={["#89f7fe", "#fad0c4"]} style={styles.container}>
            <PaperProvider>
                <SafeAreaView style={styles.safeArea}>
                    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                        <View style={styles.container}>
                            <Text style={styles.title}>Signup</Text>

                            <View style={styles.imageUploadContainer}>
                                <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                                    {imageUri ? <Image source={{ uri: imageUri }} style={styles.profileImage} /> : <Text>Select Profile Picture</Text>}
                                </TouchableOpacity>
                            </View>

                            <TextInput placeholder="Full Name" placeholderTextColor="#666" style={styles.input} value={name} onChangeText={setName} />
                            <TextInput placeholder="Unique Username" placeholderTextColor="#666" style={styles.input} value={username} onChangeText={setUsername} />
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    placeholder="Password"
                                    placeholderTextColor="#666"
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
                                <TextInput placeholder="Email" placeholderTextColor="#666" style={styles.inputField} value={email} onChangeText={setEmail} />
                                <TouchableOpacity style={[styles.smallButton, { paddingHorizontal: 12.5 }]} onPress={sendOtp}>
                                    {
                                        sendingOTP ? <ActivityIndicator color="white" style={{ paddingHorizontal: 25 }} /> : <Text style={styles.buttonText}>Send OTP</Text>
                                    }
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputRow}>
                                <TextInput placeholder="Enter OTP" placeholderTextColor="#666" style={styles.inputField} value={otp} onChangeText={setOtp} keyboardType="numeric" />
                                <TouchableOpacity style={styles.smallButton} onPress={verifyOtp}>
                                    {
                                        verifyingOTP ? <ActivityIndicator color="white" style={{ paddingHorizontal: 28 }} /> : <Text style={styles.buttonText}>Verify OTP</Text>
                                    }
                                </TouchableOpacity>
                            </View>

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
                                {loading ? <ActivityIndicator color="white" /> : <View style={styles.buttonStylings}>
                                    <Entypo name="new-message" size={24} color="white" />
                                    <Text style={styles.buttonText}>Sign Up</Text>
                                </View>}
                            </TouchableOpacity>

                            <View style={styles.separator}>
                                <View style={styles.line} />
                                <Text style={styles.orText}>OR</Text>
                                <View style={styles.line} />
                            </View>

                            <TouchableOpacity style={styles.googleButton} onPress={() => navigation.navigate("Login")}>
                                <AntDesign name="login" size={24} color="white" />
                                <Text style={styles.buttonText}>Login</Text>
                            </TouchableOpacity>

                        </View>
                        <ErrorAlert visible={errorAlertVisible} title={errorTitle} message={errorMessage} onOk={() => setErrorAlertVisible(false)} />
                        <WarningAlert visible={warningAlertVisible} title={warningTitle} message={warningMessage} onOk={() => setWarningAlertVisible(false)} onCancel={() => setWarningAlertVisible(false)} />
                        <SuccessAlert
                            visible={successAlertVisible}
                            title={successTitle}
                            message={successMessage}
                            onOk={() => {
                                setSuccessAlertVisible(false);
                                if (userCreated) {
                                    setUserCreated(false)
                                    navigation.replace('Login');
                                }
                            }}
                        />
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
    buttonStylings: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    passwordInput: {
        flex: 1,
        height: 50,
    },
    eyeIcon: {
        paddingHorizontal: 5,
    },
    smallButton: { backgroundColor: '#00796b', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 5, marginRight: 5 },
    button: { backgroundColor: '#00796b', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: 'white', fontWeight: 'bold' },
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
    imageUploadContainer: { width: '100%', justifyContent: 'center', alignItems: 'center' },
    googleButton: {
        flexDirection: "row",
        backgroundColor: "#DB4437",
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonText: { color: "white", fontWeight: "bold", marginLeft: 10, fontSize: 16 },
    separator: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 20,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: "#ccc",
    },
    orText: {
        marginHorizontal: 10,
        fontWeight: "600",
        color: "#666",
    },
});

export default SignupScreen;
