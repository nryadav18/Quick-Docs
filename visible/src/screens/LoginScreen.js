import { useState } from "react"
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
import { AntDesign, Feather } from "@expo/vector-icons"
import axios from "axios"
import { LinearGradient } from "expo-linear-gradient"
import { ErrorAlert, WarningAlert, SuccessAlert } from "../components/AlertBox"
import Note from "./Note"
import useUserStore from "../store/userStore"


const LoginScreen = () => {
    const { setUser, setToken } = useUserStore.getState();
    const navigation = useNavigation()
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    //My Custom Alert Boxes
    const [errorAlertVisible, setErrorAlertVisible] = useState(false)
    const [errorTitle, setErrorTitle] = useState("")
    const [errorMessage, setErrorMessage] = useState("")

    const [warningAlertVisible, setWarningAlertVisible] = useState(false)
    const [warningTitle, setWarningTitle] = useState("")
    const [warningMessage, setWarningMessage] = useState("")

    const [successAlertVisible, setSuccessAlertVisible] = useState(false)

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

        return true
    }

    const handleLogin = async () => {
        if (!validateInputs()) return;
        try {
            const res = await axios.post('https://quick-docs-app-backend.onrender.com/check-valid-user', { username });
            if (!res.data.exists) {
                showErrorAlert("User doesn't Exist", "Please create an Account to Login.");
                return;
            }
        } catch (err) {
            showErrorAlert("Unexpected Error Rised", "Please Try Again Later");
            return;
        }

        setWarningAlertVisible(false);
        setLoading(true);

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

                // ✅ Zustand store usage
                const { setUser, setToken } = useUserStore.getState();
                setUser(user);
                setToken(token);

                showSuccessAlert();
                setTimeout(() => {
                    setSuccessAlertVisible(false);
                    navigation.replace("Home");
                }, 1500);
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
            <Note />
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

            <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
                <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Login</Text>}
            </TouchableOpacity>

            <View style={styles.separator}>
                <View style={styles.line} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.line} />
            </View>

            <TouchableOpacity style={styles.googleButton}>
                <AntDesign name="google" size={24} color="white" />
                <Text style={styles.buttonText}>Login with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
                <Text style={styles.signupText}>Don't have an account? Sign up</Text>
            </TouchableOpacity>

            <ErrorAlert visible={errorAlertVisible} title={errorTitle} message={errorMessage} onOk={() => setErrorAlertVisible(false)} />
            <WarningAlert visible={warningAlertVisible} title={warningTitle} message={warningMessage} onOk={() => setWarningAlertVisible(false)} onCancel={() => setWarningAlertVisible(false)} />
            <SuccessAlert visible={successAlertVisible} title="Login Successful" message="You have successfully logged in!" onOk={() => setSuccessAlertVisible(false)} />

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
    forgotPassword: { color: "#00796b", textAlign: "right", marginBottom: 15, fontWeight: "500" },
    loginButton: {
        backgroundColor: "#00796b",
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
    },
    googleButton: {
        flexDirection: "row",
        backgroundColor: "#DB4437",
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 15,
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

export default LoginScreen
