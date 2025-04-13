import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, Dimensions, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';
import { ThemeContext } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { ErrorAlert, WarningAlert, SuccessAlert } from "../components/AlertBox";
import useUserStore from '../store/userStore';

const { width: screenWidth } = Dimensions.get('window');

const UploadFilesScreen = () => {
    const user = useUserStore((state) => state.user);
    const { isDarkMode } = useContext(ThemeContext);
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [fileType, setFileType] = useState(null);
    const [importance, setImportance] = useState('');
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

    // Alert States
    const [errorAlertVisible, setErrorAlertVisible] = useState(false);
    const [errorTitle, setErrorTitle] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const [warningAlertVisible, setWarningAlertVisible] = useState(false);
    const [warningTitle, setWarningTitle] = useState("");
    const [warningMessage, setWarningMessage] = useState("");

    const [successAlertVisible, setSuccessAlertVisible] = useState(false);
    const [successTitle, setSuccessTitle] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

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
        setSuccessAlertVisible(true);
        setSuccessTitle(title);
        setSuccessMessage(message);
    };

    // File selection (Document Picker)
    const pickFile = async () => {
        let result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
        if (!result.canceled) {
            const { uri, name, mimeType } = result.assets[0];
            const shortName = name.slice(0, 18); // Limit file name length
            setFile(uri);
            setFileName(shortName);
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
            showErrorAlert("Permission required", "Camera access is needed to take a photo.");
            return;
        }
        let result = await ImagePicker.launchCameraAsync();
        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setFile(uri);
            setFileName("Captured Image");
            setFileType("image/jpeg");

            Image.getSize(uri, (width, height) => {
                setImageDimensions({ width, height });
            });
        }
    };

    // Upload the file to the backend (S3 bucket)
    const uploadFile = async () => {
        if (!file || !importance || !fileName) {
            showErrorAlert("Missing Data", "Please provide a file name, select a file, and importance level.");
            return;
        }

        const formData = new FormData();
        formData.append("file", {
            uri: file,
            name: fileName,
            type: fileType
        });
        formData.append("importance", importance);
        formData.append("originalname", fileName);
        formData.append("username", user.username);

        try {
            const response = await fetch("https://quick-docs-app-backend.onrender.com/upload", {
                method: "POST",
                headers: {
                    "Content-Type": "multipart/form-data"
                },
                body: formData
            });

            const contentType = response.headers.get("content-type");
            const isJSON = contentType && contentType.indexOf("application/json") !== -1;

            const data = isJSON ? await response.json() : await response.text();

            if (response.ok) {
                showSuccessAlert("Success", "File uploaded successfully.");
                resetForm();
            } else {
                showErrorAlert("Upload Failed", "Please Upload file Less than 5MB!");
            }
        } catch (err) {
            console.error("Upload error:", err);
            showErrorAlert("Error", "Failed to upload file.");
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

        if (fileType && fileType.includes("pdf")) {
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
        <LinearGradient colors={isDarkMode ? ['#0f0c29', '#302b63', '#24243e'] : ['#89f7fe', '#fad0c4']} style={[styles.container, isDarkMode && styles.darkContainer]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.title, isDarkMode && styles.darkTitle]}>Upload a File</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Enter File Name"
                    onChangeText={setFileName}
                    value={fileName}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Enter importance (1 to 5)"
                    keyboardType="numeric"
                    maxLength={1}
                    value={importance}
                    onChangeText={setImportance}
                />

                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.uploadButton} onPress={pickFile}>
                        <Text style={styles.buttonText}>Choose File</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
                        <Text style={styles.buttonText}>Take Photo</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.previewContainer, isDarkMode && styles.darkPreviewContainer, { width: previewWidth, height: previewHeight }]}>
                    {file ? (
                        fileType && fileType.includes("pdf") ? (
                            <WebView
                                source={{ uri: `https://docs.google.com/gview?embedded=true&url=${file}` }}
                                style={{ width: '100%', height: '100%' }}
                            />
                        ) : (
                            <Image source={{ uri: file }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                        )
                    ) : (
                        <Text style={[styles.noFileText, isDarkMode && { color: 'white' }]}>Upload File with Less than 5MB and Preview your File</Text>
                    )}
                </View>

                <TouchableOpacity style={styles.submitButton} onPress={uploadFile}>
                    <Text style={styles.buttonText}>Upload</Text>
                </TouchableOpacity>
            </ScrollView>

            <ErrorAlert visible={errorAlertVisible} title={errorTitle} message={errorMessage} onOk={() => setErrorAlertVisible(false)} />
            <WarningAlert visible={warningAlertVisible} title={warningTitle} message={warningMessage} onOk={() => setWarningAlertVisible(false)} onCancel={() => setWarningAlertVisible(false)} />
            <SuccessAlert visible={successAlertVisible} title={successTitle} message={successMessage} onOk={() => setSuccessAlertVisible(false)} />
        </LinearGradient>
    );
};


const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'start', padding: 20, backgroundColor: '#F5F5F5' },
    darkContainer: { backgroundColor: '#121212' },
    title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    darkTitle: { color: '#fff' },
    input: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#ddd' },
    dropdown: { borderColor: '#00796b', borderWidth: 2, backgroundColor: '#fff', borderRadius: 10, padding: 5, marginBottom: 15 },
    dropDownContainer: { borderColor: '#00796b', borderWidth: 1, backgroundColor: '#fff' },
    dropdownLabel: { fontSize: 18, color: '#222' },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    uploadButton: { backgroundColor: '#00796b', padding: 15, borderRadius: 10, alignItems: 'center', flex: 1, marginHorizontal: 5 },
    submitButton: { backgroundColor: '#00796b', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 15 },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    previewContainer: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center', padding: 10, marginBottom: 20 },
    darkPreviewContainer: { backgroundColor: '#121212', },
    previewTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    noFileText: { fontSize: 16, color: '#888' },
});

export default UploadFilesScreen;
