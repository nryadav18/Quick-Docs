import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { ThemeContext } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import useUserStore from '../store/userStore';
import { ErrorAlert, WarningAlert, SuccessAlert } from "../components/AlertBox"
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons'
import BirthdayIcon from 'react-native-vector-icons/FontAwesome5'



const ProfileScreen = () => {
    const navigation = useNavigation();
    const { clearUser } = useUserStore.getState();
    const { isDarkMode } = useContext(ThemeContext);
    const [onWarningConfirm, setOnWarningConfirm] = useState(null);
    const [isDeactivating, setIsDeactivating] = useState(false);
    const [countdown, setCountdown] = useState('');
    const [showBirthdayModal, setShowBirthdayModal] = useState(false);
    const [hasShownBirthdayModal, setHasShownBirthdayModal] = useState(false);
    const user = useUserStore((state) => state.user);

    useEffect(() => {
        let intervalId;

        if (!user?.dob) return;

        const resetModalFlag = () => {
            const now = new Date();
            const resetTime = new Date(now);
            resetTime.setHours(0, 1, 0, 0); // 12:01 AM
            const timeout = resetTime - now;
            if (timeout > 0) {
                setTimeout(() => {
                    setHasShownBirthdayModal(false);
                }, timeout);
            }
        };

        resetModalFlag();

        const calculateNextBirthday = () => {
            const now = new Date();
            const dob = new Date(user.dob);
            const nextBirthday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate(), 0, 0, 0);
            if (nextBirthday <= now) {
                nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
            }
            return nextBirthday;
        };

        const updateCountdown = () => {
            const now = new Date();
            const nextBD = calculateNextBirthday();
            const diff = nextBD - now;

            if (diff <= 1000 && !hasShownBirthdayModal) {
                setShowBirthdayModal(true);
                setHasShownBirthdayModal(true);
            } else if (nextBD.toDateString() === now.toDateString()) {
                setCountdown('🎉 Happy Birthday!');
            } else {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((diff / (1000 * 60)) % 60);
                const seconds = Math.floor((diff / 1000) % 60);

                setCountdown(`${days}d :: ${hours}h :: ${minutes}m :: ${seconds}s`);
            }
        };

        updateCountdown();
        intervalId = setInterval(updateCountdown, 1000);

        const scheduleBirthdayNotification = async () => {
            if (Constants.isDevice) {
                const now = new Date();

                const testTrigger = new Date(now);
                testTrigger.setHours(21, 40, 0, 0); // Set to 8:00 PM today

                if (testTrigger <= now) {
                    // If it's already past 8:00 PM, schedule for tomorrow
                    testTrigger.setDate(testTrigger.getDate() + 1);
                }

                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: `🎉 Happy Birthday ${user.name}!`,
                        body: `Wishing you a wonderful day! 🎂🎈 (Test Notification)`,
                    },
                    trigger: {
                        date: testTrigger,
                    },
                });

                console.log(`🎯 Notification scheduled for: ${testTrigger}`);
            }
        };



        scheduleBirthdayNotification();

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [user?.dob, hasShownBirthdayModal]);





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
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <LinearGradient colors={isDarkMode ? ['#0f0c29', '#302b63', '#24243e'] : ['#89f7fe', '#fad0c4']} style={[styles.container, isDarkMode && styles.darkContainer]}>
                {/* Header */}
                <View style={[styles.header, isDarkMode && styles.darkHeader]}>
                    <TouchableOpacity onPress={pickImage}>
                        <Image
                            key={user?.profileImageUrl || 'default-image'}
                            source={
                                user?.profileImageUrl
                                    ? { uri: `${user.profileImageUrl}?${new Date().getTime()}` }
                                    : require('../../assets/logomain.png')
                            }
                            style={styles.profileImage}
                            priority="high" // Ensures the image is preloaded
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
                            <Ionicons name="mail-outline" size={30} color="#CB0404" />
                            <Text style={[styles.statNumber, isDarkMode && styles.darkText]}>{user.email}</Text>
                            <Text style={[styles.statLabel, isDarkMode && styles.darkSubText]}>Email</Text>
                        </View>
                    </View>
                    <View style={[styles.statRow, { marginTop: 10 }]}>
                        <View style={[styles.statItem, { gap: 10 }]}>
                            {countdown === '🎉 Happy Birthday!' ? <BirthdayIcon name="birthday-cake" size={30} color="#DC8BE0" />
                                : <Ionicons name="time-outline" size={30} color="#6a1b9a" />}
                            <Text style={[styles.statNumber, isDarkMode && styles.darkText,
                            countdown === '🎉 Happy Birthday!' ? { fontSize: 24 } : { fontSize: 20 }]}>
                                {countdown === '🎉 Happy Birthday!' ? '🎉 Happy Birthday!' : countdown}
                            </Text>
                            <Text style={[styles.statLabel, isDarkMode && styles.darkSubText]}>
                                {countdown === '🎉 Happy Birthday!' ? 'Wishing you a wonderful day! 🎂🎈' : 'Your Next Birthday🎈'}
                            </Text>
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
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={showBirthdayModal}
                    onRequestClose={() => setShowBirthdayModal(false)}
                >
                    <View style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <View style={{
                            width: '85%',
                            backgroundColor: isDarkMode ? '#1c1c1e' : '#fff',
                            paddingVertical: 30,
                            paddingHorizontal: 20,
                            borderRadius: 25,
                            alignItems: 'center',
                            shadowColor: isDarkMode ? '#ffffff' : '#000',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: isDarkMode ? 0.3 : 0.3,
                            shadowRadius: isDarkMode ? 15 : 10,
                            elevation: 12,

                        }}>
                            <TouchableOpacity
                                onPress={() => setShowBirthdayModal(false)}
                                style={{
                                    position: 'absolute',
                                    top: 15,
                                    right: 15,
                                    zIndex: 10,
                                }}
                            >
                                <Icon name="close" size={30} color="#FF3B30" />
                            </TouchableOpacity>

                            <View style={{
                                width: 130,
                                height: 130,
                                borderRadius: 75,
                                overflow: 'hidden',
                                borderWidth: 4,
                                borderColor: '#FFD700',
                                marginBottom: 20,
                            }}>
                                <Image
                                    source={{ uri: user?.profileImageUrl }}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="cover"
                                />
                            </View>

                            <Text style={{
                                fontSize: 26,
                                fontWeight: 'bold',
                                color: isDarkMode ? '#fff' : '#333',
                                textAlign: 'center'
                            }}>
                                🎉 Happy Birthday, {user.name}!
                            </Text>

                            <Text style={{
                                marginTop: 12,
                                fontSize: 16,
                                color: isDarkMode ? '#ccc' : '#666',
                                textAlign: 'center',
                                paddingHorizontal: 10,
                            }}>
                                Wishing you a day filled with love, laughter, and unforgettable memories. 💖
                            </Text>

                            <TouchableOpacity
                                onPress={() => setShowBirthdayModal(false)}
                                style={{
                                    marginTop: 25,
                                    backgroundColor: '#FF69B4',
                                    paddingVertical: 12,
                                    paddingHorizontal: 30,
                                    borderRadius: 30,
                                    shadowColor: '#FF69B4',
                                    shadowOffset: { width: 0, height: 3 },
                                    shadowOpacity: 0.4,
                                    shadowRadius: 6,
                                    elevation: 5,
                                }}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>




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
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA', alignItems: 'center', paddingHorizontal: 20 },
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

    name: { fontSize: 22, fontWeight: 'bold', color: 'black', marginBottom: 6 },
    username: { fontSize: 16, fontWeight: 'bold', fontStyle: 'italic', color: 'black', marginBottom: 5 },

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
