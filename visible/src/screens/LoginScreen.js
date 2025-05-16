import { useState, useEffect } from "react"
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Image
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { AntDesign, Feather, Entypo } from "@expo/vector-icons"
import axios from "axios"
import { LinearGradient } from "expo-linear-gradient"
import { ErrorAlert, WarningAlert, SuccessAlert } from "../components/AlertBox"
import useUserStore from "../store/userStore"
import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from "react-native";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const LoginScreen = () => {
    const { setUser, setToken } = useUserStore.getState();
    const navigation = useNavigation()
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [validUser, setValidUser] = useState(false)

    //My Custom Alert Boxes
    const [errorAlertVisible, setErrorAlertVisible] = useState(false)
    const [errorTitle, setErrorTitle] = useState("")
    const [errorMessage, setErrorMessage] = useState("")

    const [warningAlertVisible, setWarningAlertVisible] = useState(false)
    const [warningTitle, setWarningTitle] = useState("")
    const [warningMessage, setWarningMessage] = useState("")

    const [successAlertVisible, setSuccessAlertVisible] = useState(false)

    const [biometricSuccess, setBiometricSuccess] = useState(false);
    const [expoPushToken, setExpoPushToken] = useState('');


    useEffect(() => {
        const checkBiometricSupportAndAuthenticate = async () => {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();

            if (!compatible || !enrolled) {
                showWarningAlert("Biometric Unavailable", "Your device does not support biometric authentication or no fingerprints are enrolled.");
                return;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: "Authenticate with fingerprint",
                fallbackLabel: "Use Passcode",
                cancelLabel: "Cancel",
            });

            if (!result.success) {
                showErrorAlert("Authentication Failed", "Fingerprint authentication failed or was cancelled.");
                return;
            }
            setBiometricSuccess(true);
        };

        checkBiometricSupportAndAuthenticate();
    }, []);

    useEffect(() => {
        const registerForPushNotificationsAsync = async () => {

            if (Device.isDevice) {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
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
                        projectId: 'c4e2ff4d-6edb-4799-a901-69c02363b13a',
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

    const reEnableFingerprint = async () => {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();

        if (!compatible || !enrolled) {
            showWarningAlert("Biometric Unavailable", "Your device does not support biometric authentication or no fingerprints are enrolled.");
            return;
        }

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: "Re-authenticate with fingerprint",
            fallbackLabel: "Use Passcode",
            cancelLabel: "Cancel",
        });

        if (result.success) {
            setBiometricSuccess(true);
        } else {
            showErrorAlert("Authentication Failed", "Fingerprint authentication failed or was cancelled.");
        }
    };

    const sendPushNotification = async (expoPushToken, title, body) => {
        try {
            await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: expoPushToken,
                    sound: 'default',
                    title,
                    body,
                }),
            });
        } catch (error) {
            console.warn('Push notification failed:', error);
        }
    };

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

    const showSuccessAlert = () => {
        setSuccessAlertVisible(true)
    }

    const validateInputs = async () => {
        if (!username.trim()) {
            showErrorAlert("Empty Username", "Please enter your username to continue.")
            return false
        }

        if (!password.trim()) {
            showErrorAlert("Empty Password", "Please enter your password to continue.")
            return false
        }

        if (password.trim().length < 8) {
            showWarningAlert("Weak Password", "Your password seems too short. Are you sure you want to continue?")
            return false
        }

        return true;
    }

    const handleLogin = async () => {
        const isValid = await validateInputs(); // await the validation
        if (!isValid) return; // stop here if invalid
        setLoading(true);

        try {
            const res = await axios.post('https://quick-docs-app-backend.onrender.com/check-valid-user', { username });
            if (!res.data.exists) {
                showErrorAlert("User doesn't Exist", "Please create an Account to Login.");
                setLoading(false)
                return;
            }
        } catch (err) {
            showErrorAlert("Unexpected Error Rised", "Please Try Again Later");
            setLoading(false)
            return;
        }

        setWarningAlertVisible(false);

        try {
            const trimmedUsername = username.trim();
            const trimmedPassword = password.trim();

            const response = await axios.post("https://quick-docs-app-backend.onrender.com/login", {
                username: trimmedUsername,
                password: trimmedPassword,
            });

            setLoading(false);

            if (response.status === 200) {
                const { token, user } = response.data;

                try {
                    const trimmedUsername = username.trim();
                    const updateNotificationToken = await axios.post('https://quick-docs-app-backend.onrender.com/update-notification-token',
                        { expoNotificationToken: expoPushToken, username: trimmedUsername })
                    console.log(expoPushToken)
                    console.log('Successfully Updated the Token', updateNotificationToken.data)
                }
                catch (error) {
                    console.log('Error Occured while Updating the Token', error)
                }


                // ✅ Zustand store usage
                const { setUser, setToken } = useUserStore.getState();
                setUser(user);
                setToken(token);
                showSuccessAlert();
                setValidUser(true)
            } else {
                showErrorAlert("Login Failed", response.data.message || "Unable to login. Please try again.");
            }
        } catch (error) {
            setLoading(false);
            if (error.response?.status === 401) {
                showErrorAlert("Invalid Credentials", "The username or password you entered is incorrect.");
            } else if (error.response?.status === 403) {
                showErrorAlert("Account Locked", "Your account has been locked due to multiple failed attempts.");
            } else if (error.message === "Network Error") {
                showErrorAlert("Connection Error", "Please check your internet connection.");
            } else {
                showErrorAlert("Login Failed", "Username and Password doesn't match!");
            }
        }

    };


    return (
        <LinearGradient colors={["#89f7fe", "#fad0c4"]} style={styles.container}>
            <Image source={require("../../assets/logomain.png")} style={styles.logo} />
            <Text style={styles.title}>Welcome Back</Text>

            <TextInput
                placeholder="Username"
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholderTextColor="#666"
            />

            <View style={styles.passwordContainer}>
                <TextInput
                    placeholder="Password"
                    style={styles.passwordInput}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#666"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Feather name={showPassword ? "eye" : "eye-off"} size={22} color="#555" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}
                disabled={!biometricSuccess}>
                <Text style={[styles.forgotPassword, (!biometricSuccess) && { color: '#a8adaa' }]}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.loginButton, (!biometricSuccess) && styles.disabledButton]}
                onPress={handleLogin}
                disabled={loading || !biometricSuccess}>
                {loading ? <ActivityIndicator color="white" style={{ paddingVertical: 3 }} /> :
                    <View style={styles.buttonStylings}><AntDesign name="login" size={24} color="white" /><Text style={styles.buttonText}>Login</Text></View>}
            </TouchableOpacity>

            <View style={styles.separator}>
                <View style={styles.line} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.line} />
            </View>

            <TouchableOpacity style={[styles.googleButton, (!biometricSuccess) && styles.disabledButton]}
                onPress={() => navigation.navigate("Signup")}
                disabled={!biometricSuccess}>
                <Entypo name="new-message" size={24} color="white" />
                <Text style={styles.buttonText}>Signup/ Register</Text>
            </TouchableOpacity>

            <View style={{ width: '100%', alignItems: 'center', marginTop: 20 }}>
                <TouchableOpacity
                    onPress={reEnableFingerprint}
                    disabled={biometricSuccess}
                    style={{
                        width: 76,
                        height: 76,
                        borderRadius: 40,
                        backgroundColor: '#4E71FF',
                        justifyContent: 'center',
                        alignItems: 'center',
                        opacity: biometricSuccess ? 0 : 1,
                    }}
                >
                    <MaterialCommunityIcons name="fingerprint" size={44} color="white" />
                </TouchableOpacity>
            </View>


            <ErrorAlert visible={errorAlertVisible} title={errorTitle} message={errorMessage} onOk={() => setErrorAlertVisible(false)} />
            <WarningAlert visible={warningAlertVisible} title={warningTitle} message={warningMessage} onOk={() => setWarningAlertVisible(false)} onCancel={() => setWarningAlertVisible(false)} />
            <SuccessAlert
                visible={successAlertVisible}
                title="Login Successful"
                message="You have successfully logged in!"
                onOk={async () => {
                    setSuccessAlertVisible(false);
                    if (validUser) {
                        setValidUser(false)
                        if (expoPushToken) {
                            await sendPushNotification(
                                expoPushToken,
                                'Welcome to Quick Docs App!',
                                `One Stop Destination to Store, Summarize your Important Files`
                            );
                        }
                        navigation.replace('Home');
                    }
                }}
            />
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", padding: 20 },
    logo: { width: 100, height: 100, resizeMode: "contain", alignSelf: "center", marginBottom: 10 },
    title: { fontSize: 26, fontWeight: "700", textAlign: "center", color: "#333", marginBottom: 20 },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 12,
        borderColor: "#ccc",
        backgroundColor: "#fff",
    },
    disabledButton: {
        backgroundColor: '#a8adaa'
    },
    passwordContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        borderColor: "#ccc",
        backgroundColor: "#fff",
        height: 50,
        marginBottom: 12,
        justifyContent: "space-between",
    },
    passwordInput: {
        flex: 1,
        height: "100%",
        color: "#333",
    },
    buttonStylings: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    forgotPassword: { color: "#00796b", textAlign: "right", marginBottom: 15, fontWeight: "500" },
    loginButton: {
        backgroundColor: "#00796b",
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
        flexDirection: 'row',
        justifyContent: 'center',
    },
    googleButton: {
        flexDirection: "row",
        backgroundColor: "#DB4437",
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 50
    },
    buttonText: { color: "white", fontWeight: "bold", marginLeft: 10, fontSize: 16 },
    signupText: { textAlign: "center", marginTop: 20, fontWeight: "500", color: "#333" },
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
})

export default LoginScreen;