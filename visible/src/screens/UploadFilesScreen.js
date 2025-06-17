import React, { useContext, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator,
    Dimensions,
    ScrollView,
    Linking
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';
import { ThemeContext } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { ErrorAlert, WarningAlert, SuccessAlert, PermissionAlert } from '../components/AlertBox';
import useUserStore from '../store/userStore';
import { FontAwesome5 } from 'react-native-vector-icons'
import useThemedStatusBar from '../hooks/StatusBar';
import CrownIcon from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from "@react-navigation/native"
import { BACKEND_URL } from '@env';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { scaleFont } from "../components/ScaleFont"


const { width: screenWidth } = Dimensions.get('window');

const UploadFilesScreen = () => {
    const user = useUserStore((state) => state.user);
    const setUser = useUserStore((state) => state.setUser);

    const { isDarkMode } = useContext(ThemeContext);
    const navigation = useNavigation()

    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [fileType, setFileType] = useState(null);
    const [importance, setImportance] = useState('');
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
    const [uploadingState, setUploadingState] = useState(false)

    // Alert States
    const [errorAlertVisible, setErrorAlertVisible] = useState(false);
    const [errorTitle, setErrorTitle] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [warningAlertVisible, setWarningAlertVisible] = useState(false);
    const [warningTitle, setWarningTitle] = useState('');
    const [warningMessage, setWarningMessage] = useState('');
    const [successAlertVisible, setSuccessAlertVisible] = useState(false);
    const [successTitle, setSuccessTitle] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [permissionVisible, setPermissionVisible] = useState(false);
    const [permissionTitle, setPermissionTitle] = useState('');
    const [permissionMessage, setPermissionMessage] = useState('');

    useThemedStatusBar(isDarkMode)
    useFocusEffect(
        React.useCallback(() => {
            const checkPermissionOnFocus = async () => {
                if (permissionVisible) {
                    const { status } = await ImagePicker.getCameraPermissionsAsync();
                    if (status === 'granted') {
                        setPermissionVisible(false);
                    }
                }
            };

            checkPermissionOnFocus();
        }, [permissionVisible])
    );


    // Custom Alert Functions
    const showErrorAlert = (title, message) => {
        setErrorTitle(title);
        setErrorMessage(message);
        setErrorAlertVisible(true);
    };

    const showWarningAlert = (title, message) => {
        setWarningTitle(title);
        setWarningMessage(message);
        setWarningAlertVisible(true);
    };

    const showSuccessAlert = (title, message) => {
        setSuccessTitle(title);
        setSuccessMessage(message);
        setSuccessAlertVisible(true);
    };

    const showPermissionAlert = (title, message) => {
        setPermissionTitle(title)
        setPermissionMessage(message)
        setPermissionVisible(true)
    }

    // File selection (Document Picker)
    const pickFile = async () => {
        let result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
        if (!result.canceled) {
            const { uri, name, mimeType } = result.assets[0];
            setFile(uri);
            setFileType(mimeType);
            if (mimeType.startsWith('image/')) {
                Image.getSize(uri, (width, height) => {
                    setImageDimensions({ width, height });
                });
            }
        }
    };

    // Capture image (Camera)
    const takePhoto = async () => {
        let permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
            showPermissionAlert('Camera Access Needed', 'To Take a Picture, You Must Enable the Camera Permission!')
            return;
        }
        let result = await ImagePicker.launchCameraAsync();
        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setFile(uri);
            setFileType('image/jpeg');
            Image.getSize(uri, (width, height) => {
                setImageDimensions({ width, height });
            });
        }
    };

    const generateId = () => {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 9); // 7-character random string
        return `${timestamp}-${randomString}`;
    };

    // Upload the file to the backend (GC bucket)
    const allowedTypes = ['pdf', 'docx', 'jpg', 'jpeg', 'png'];
    const uploadFile = async () => {
        setUploadingState(true)
        if (!file || !importance || !fileName) {
            showErrorAlert('Missing Data', 'Please provide a file name, select a file, and importance level.');
            setUploadingState(false)
            return;
        }

        const fileExtension = file.split('.').pop().toLowerCase();
        console.log(fileExtension)
        if (!allowedTypes.includes(fileExtension)) {
            showErrorAlert('Invalid File Type', 'Only PDF, DOCX, JPG, JPEG and PNG files are allowed.');
            setUploadingState(false)
            return;
        }

        try {
            const formData = new FormData();
            const newFileName = fileName.trim();
            formData.append('file', {
                uri: file,
                name: newFileName,
                type: fileType,
            });
            formData.append('originalname', newFileName);
            formData.append('username', user?.username ?? '');
            formData.append('importance', importance);

            const response = await fetch(`${BACKEND_URL}/upload`, {
                method: 'POST',
                body: formData,
            });

            const text = await response.text();

            try {
                const data = JSON.parse(text);   // parse manually to catch errors
                if (!response.ok) {
                    showErrorAlert('Upload Failed', data?.message || 'Unknown error');
                    setUploadingState(false);
                    return;
                }
                console.log(response.file)
                const newFile = {
                    id: generateId(),
                    name: newFileName,
                    type: fileExtension,
                    url: file,
                    rating: importance,
                };

                console.log(newFile)

                const updatedUser = {
                    ...user,
                    myfiles: [...(user?.myfiles ?? []), newFile],
                };

                setUser(updatedUser); // Update Zustand

                showSuccessAlert('Success', 'File uploaded successfully.');
                setUploadingState(false)
                resetForm();
            } catch (e) {
                console.error('Response parsing error:', e, 'Raw response:', text);
                showErrorAlert('Upload Failed', 'Server returned invalid response');
                setUploadingState(false);
                return;
            }

        } catch (err) {
            console.error('Upload error:', err);
            showErrorAlert('Error', 'Failed to upload file.');
            setUploadingState(false)
        }
    };

    const resetForm = () => {
        setFile(null);
        setFileName('');
        setFileType(null);
        setImportance('');
        setImageDimensions({ width: 0, height: 0 });
    };

    const calculatePreviewSize = () => {
        let maxPreviewWidth = screenWidth * 0.9; // 90% of screen width
        let maxPreviewHeight = 250;

        if (fileType && fileType.includes('pdf')) {
            return { width: '100%', height: 250 }; // Fixed size for PDFs
        }

        if (imageDimensions.width && imageDimensions.height) {
            const aspectRatio = imageDimensions.width / imageDimensions.height;
            if (imageDimensions.width > imageDimensions.height) {
                return {
                    width: Math.min(maxPreviewWidth, imageDimensions.width),
                    height: Math.min(maxPreviewHeight, imageDimensions.height / aspectRatio),
                };
            } else {
                return {
                    width: Math.min(maxPreviewWidth, imageDimensions.width * aspectRatio),
                    height: Math.min(maxPreviewHeight, imageDimensions.height),
                };
            }
        }

        return { width: maxPreviewWidth, height: maxPreviewHeight };
    };

    const { width: previewWidth, height: previewHeight } = calculatePreviewSize();

    return (
        <LinearGradient
            colors={isDarkMode ? ['#0f0c29', '#302b63', '#24243e'] : ['#89f7fe', '#fad0c4']}
            style={[styles.container, isDarkMode && styles.darkContainer]}
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.title, isDarkMode && styles.darkTitle]}>Upload a File</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter File Name"
                    onChangeText={setFileName}
                    value={fileName}
                    placeholderTextColor="#666"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Enter importance (1 to 5)"
                    keyboardType="numeric"
                    maxLength={1}
                    value={importance}
                    onChangeText={setImportance}
                    placeholderTextColor="#666"
                />
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.uploadButton} onPress={pickFile}>
                        <Text style={styles.buttonText}>Choose File</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
                        <Text style={styles.buttonText}>Take Photo</Text>
                    </TouchableOpacity>
                </View>
                <View
                    style={[
                        styles.previewContainer,
                        isDarkMode && styles.darkPreviewContainer,
                        { width: previewWidth, height: previewHeight },
                    ]}
                >
                    {file ? (
                        fileType && fileType.includes('pdf') ? (
                            <Image
                                source={require('../../assets/pdf.png')}
                                style={{ width: '60%', height: '60%' }}
                                resizeMode="contain"
                            />
                        ) : (
                            <Image source={{ uri: file }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                        )
                    ) : (
                        <Text style={[styles.noFileText, isDarkMode && { color: 'white' }]}>
                            Upload File with Less than 5MB and Preview your File
                        </Text>
                    )}
                </View>
                {
                    (
                        (!user?.premiumuser && (user?.myfiles?.length) >= 1) ||
                        (
                            user?.premiumuser &&
                            (user?.premiumDetails?.length) === 1 &&
                            user?.premiumDetails?.[0]?.type === 'Pro Plan' &&
                            (user?.myfiles?.length) >= 10
                        )
                    ) ? (
                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                { backgroundColor: isDarkMode ? 'rgba(209, 184, 17, 0.26)' : '#E9A319' }
                            ]}
                            onPress={() => navigation.navigate('Premium')}
                        >
                            <View style={styles.buttonStylings}>
                                <CrownIcon name="crown" size={24} color="#FFD700" />
                                <Text style={[styles.buttonText, isDarkMode && { color: '#FFF085' }]}>
                                    Buy Premium to Upload
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.submitButton} onPress={uploadFile}>
                            {uploadingState ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <View style={styles.buttonStylings}>
                                    <FontAwesome5 name="file-upload" size={24} color="white" />
                                    <Text style={styles.buttonText}>Upload File</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    )
                }

            </ScrollView>

            {/* Alert Components */}
            <ErrorAlert visible={errorAlertVisible} title={errorTitle} message={errorMessage} onOk={() => setErrorAlertVisible(false)} />
            <WarningAlert visible={warningAlertVisible} title={warningTitle} message={warningMessage} onOk={() => setWarningAlertVisible(false)} onCancel={() => setWarningAlertVisible(false)} />
            <SuccessAlert visible={successAlertVisible} title={successTitle} message={successMessage} onOk={() => setSuccessAlertVisible(false)} />
            <PermissionAlert visible={permissionVisible} title={permissionTitle} message={permissionMessage} onAllow={() => { Linking.openSettings(); }} onCancel={() => setPermissionVisible(false)} />
        </LinearGradient>
    );
};

// Styles remain unchanged — you can keep the same styles from your original file
const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'start', padding: 20, backgroundColor: '#F5F5F5' },
    darkContainer: { backgroundColor: '#121212' },
    title: { fontSize: scaleFont(26), fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    darkTitle: { color: '#fff' },
    input: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        fontSize: scaleFont(14),
        borderWidth: 1,
        borderColor: '#ddd',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    uploadButton: {
        backgroundColor: '#00796b',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 5,
    },
    submitButton: {
        backgroundColor: '#00796b',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 15,
    },
    buttonStylings: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: scaleFont(16) },
    previewContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        marginBottom: 20,
    },
    darkPreviewContainer: { backgroundColor: '#121212' },
    noFileText: { fontSize: scaleFont(14),  color: '#888', textAlign : 'center' },
});

export default UploadFilesScreen;