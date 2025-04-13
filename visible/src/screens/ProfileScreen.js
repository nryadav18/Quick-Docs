import React, { useContext, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ThemeContext } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import useUserStore from '../store/userStore';
import { ErrorAlert, WarningAlert, SuccessAlert } from "../components/AlertBox"
import { LinearGradient } from 'expo-linear-gradient';


const ProfileScreen = () => {
    const navigation = useNavigation();
    const { clearUser } = useUserStore.getState();
    const { isDarkMode } = useContext(ThemeContext);
    const [onWarningConfirm, setOnWarningConfirm] = useState(null);
    const [isDeactivating, setIsDeactivating] = useState(false);
    const user = useUserStore((state) => state.user);


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

    if (!user) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Redirecting to login...</Text>
            </View>
        );
    }

    //My Custom Alert Functions
    const showErrorAlert = (title, message) => {
        setErrorTitle(title)
        setErrorMessage(message)
        setErrorAlertVisible(true)
    }

    const showSuccessAlert = (title, message) => {
        setSuccessAlertVisible(true)
        setSuccessTitle(title)
        setSuccessMessage(message)
    }

    const showWarningAlert = (title, message, onConfirm) => {
        setWarningTitle(title)
        setWarningMessage(message)
        setWarningAlertVisible(true)
        setOnWarningConfirm(() => onConfirm);  // Store the callback
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const options = { day: '2-digit', month: 'long', year: 'numeric' };
        return date.toLocaleDateString('en-GB', options).replace(/ /g, ' - ');
    };


    // Function to pick an image
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'You need to grant camera roll permission to upload an image.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setProfileImage({ uri: result.assets[0].uri });
        }
    };

    const handleDeactivateAccount = async () => {
        showWarningAlert(
            "Confirm Deactivation",
            "Are you sure you want to deactivate your account? This action cannot be undone.",
            async () => {
                setIsDeactivating(true);
                try {
                    const response = await fetch('https://quick-docs-app-backend.onrender.com/deactivate', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: user.email,
                            username: user.username
                        })
                    });

                    if (response.ok) {
                        showSuccessAlert("Account Deactivated", "Your account has been deactivated successfully.");
                        clearUser();
                        navigation.replace('Login');
                    } else {
                        showErrorAlert("Error", "Failed to deactivate account. Please try again.");
                    }
                } catch (error) {
                    showErrorAlert("Network Error", "Unable to connect to server. Please try again later.");
                }
                setIsDeactivating(false);
            }
        );
    };


    return (
        <LinearGradient colors={isDarkMode ? ['#0f0c29', '#302b63', '#24243e'] : ['#89f7fe', '#fad0c4']} style={[styles.container, isDarkMode && styles.darkContainer]}>
            {/* Header */}
            <View style={[styles.header, isDarkMode && styles.darkHeader]}>
                <TouchableOpacity onPress={pickImage}>
                    <Image
                        source={
                            user?.profileImageUrl
                                ? { uri: user.profileImageUrl }
                                : require('../../assets/logomain.png') // Fallback image
                        }
                        style={styles.profileImage}
                    />

                    <View style={styles.cameraIcon}>
                        <Ionicons name="camera" size={20} color="#FFF" />
                    </View>
                </TouchableOpacity>
                <Text style={[styles.name, isDarkMode && styles.darkText]}>{user.name}</Text>
                <Text style={[styles.username, isDarkMode && styles.darkSubText]}>{user.username}</Text>
            </View>

            {/* Stats Card */}
            <View style={[styles.card, isDarkMode && styles.darkCard]}>
                <View style={styles.statRow}>
                    <View style={styles.statItem}>
                        <Ionicons name="document-text-outline" size={30} color="#00796b" />
                        <Text style={[styles.statNumber, isDarkMode && styles.darkText]}>{user.myfiles.length}</Text>
                        <Text style={[styles.statLabel, isDarkMode && styles.darkSubText]}>Files Uploaded</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="calendar-outline" size={30} color="#FF8C00" />
                        <Text style={[styles.statNumber, isDarkMode && styles.darkText]}>
                            {formatDate(user.dob)}
                        </Text>
                        <Text style={[styles.statLabel, isDarkMode && styles.darkSubText]}>
                            Date of Birth
                        </Text>
                    </View>
                </View>
                <View style={[styles.statRow, styles.emailRow]}>
                    <View style={styles.statItem}>
                        <Ionicons name="mail-outline" size={30} color="#FF8C00" />
                        <Text style={[styles.statNumber, isDarkMode && styles.darkText]}>{user.email}</Text>
                        <Text style={[styles.statLabel, isDarkMode && styles.darkSubText]}>Email</Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => {
                    clearUser();
                    navigation.replace('Login');
                }}
            >
                <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>


            <TouchableOpacity style={[styles.logoutButton, { backgroundColor: '#FF3B30', marginTop: 15, paddingHorizontal: 35, paddingVertical: 15, }]} onPress={handleDeactivateAccount}>
                <Text style={styles.buttonText}>Deactivate Account</Text>
            </TouchableOpacity>

            <ErrorAlert visible={errorAlertVisible} title={errorTitle} message={errorMessage} onOk={() => setErrorAlertVisible(false)} />
            <WarningAlert
                visible={warningAlertVisible}
                title={warningTitle}
                message={warningMessage}
                onCancel={() => {
                    setWarningAlertVisible(false);
                    setOnWarningConfirm(null);
                }}
                onOk={() => {
                    setWarningAlertVisible(false);
                    if (onWarningConfirm) onWarningConfirm();
                    setOnWarningConfirm(null);
                }}
            />
            <SuccessAlert visible={successAlertVisible} title={successTitle} message={successMessage} onOk={() => setSuccessAlertVisible(false)} />
        </LinearGradient >
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA', alignItems: 'center', padding: 20 },
    darkMode: { backgroundColor: '#121212' },

    header: {
        alignItems: 'center',
        width: '100%',
        padding: 30,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        position: 'relative'
    },
    darkHeader: {
        shadowOpacity: 0.5,
        shadowRadius: 8,
    },

    profileImage: { width: 160, height: 160, borderRadius: 100, marginBottom: 10 },

    cameraIcon: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: '#00796b',
        borderRadius: 15,
        padding: 5,
    },

    name: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
    username: { fontSize: 16, color: '#EEE', marginBottom: 5 },

    card: {
        width: '90%',
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginTop: -20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        alignItems: 'center'
    },
    darkCard: {
        backgroundColor: '#1E1E1E',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,1)', // Light border effect
        elevation: 8,
        shadowColor: 'rgba(255, 255, 255, 1)', // Subtle white shadow for contrast
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
    },

    statRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10 },
    emailRow: { justifyContent: 'center' },

    statItem: { alignItems: 'center', flex: 1 },
    statNumber: { fontSize: 18, fontWeight: 'bold', marginTop: 5 },
    statLabel: { fontSize: 14, color: '#777' },

    logoutButton: {
        backgroundColor: '#00796b',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 25,
        marginTop: 30,
        elevation: 5
    },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 18, textAlign: 'center' },

    darkText: { color: '#FFF' },
    darkSubText: { color: '#BBB' }
});

export default ProfileScreen;
