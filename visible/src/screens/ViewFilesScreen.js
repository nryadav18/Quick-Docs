import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    TextInput,
    ActivityIndicator,
    Dimensions,
    Modal,
    ScrollView,
    StatusBar,
    Platform,
    Linking,
    Appearance
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import LottieView from 'lottie-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import useUserStore from '../store/userStore';
import { ErrorAlert, WarningAlert, SuccessAlert } from "../components/AlertBox"
import axios from 'axios';
import * as MediaLibrary from 'expo-media-library';
import useThemedStatusBar from '../hooks/StatusBar';
import { BACKEND_URL } from '@env';
import { scaleFont } from "../components/ScaleFont"


// File Icons
const fileIcons = {
    pdf: '../../assets/pdf.png',
    docx: '../../assets/doc_icon.png',
};


// Main Component  
const ViewFilesScreen = () => {
    const user = useUserStore((state) => state.user);
    const deviceExpoNotificationToken = useUserStore((state) => state.getDeviceExpoNotificationToken());
    const { isDarkMode } = useContext(ThemeContext);
    const [searchText, setSearchText] = useState('');
    const [selectedType, setSelectedType] = useState('All');
    const [loading, setLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [pdfUri, setPdfUri] = useState(null);
    const [files, setFiles] = useState([]);

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

    const [isDeleting, setIsDeleting] = useState(false);

    const [onWarningConfirm, setOnWarningConfirm] = useState(null);
    const [docxUrl, setDocxUrl] = useState(null);

    useThemedStatusBar(isDarkMode)

    useEffect(() => {
        setFiles(user?.myfiles ?? []);
    }, [user?.myfiles]);


    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer); // Cleanup timeout on unmount
    }, [searchText, selectedType]);


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

    useEffect(() => {
        StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');

        if (Platform.OS === 'android') {
            StatusBar.setBackgroundColor(isDarkMode ? '#0f0c29' : '#89f7fe');
        }
    }, [])


    const getExtensionFromMime = (mimeType) => {
        const map = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'application/pdf': 'pdf',
            'video/mp4': 'mp4',
            'text/plain': 'txt',
            'application/msword': 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        };
        return map[mimeType]; // No fallback
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

    // View File Function
    const handleViewFile = async (file) => {
        console.log("File URI: ", file.uri);

        if (!file.url) {
            console.warn("File URL is missing");
            return;
        }

        console.log("Local File Type: " + file.type);

        let fileUri = file.url;
        let fileType = file.type;

        if (fileType.includes('jpg') || fileType.includes('jpeg') || fileType.includes('png')) {
            console.log('It is an Image');
            setImagePreview(fileUri);
            return; // Exit early after showing image
        }

        // If file URI doesn't start with http, fetch from backend
        if (!fileUri.startsWith("http")) {
            try {
                const response = await axios.post(`${BACKEND_URL}/file-data-thrower`, {
                    username: user?.username ?? 'unknown',
                    itemname: file?.name ?? 'unnamed-file',
                });

                if (response.data?.fileUrl) {
                    fileUri = response.data.fileUrl;
                    fileType = response.data.fileType;
                } else {
                    console.warn("File URL not returned from backend");
                    return;
                }
            } catch (error) {
                console.error("Error fetching file URL from backend:", error);
                return;
            }
        }

        if (fileType.includes('pdf') || fileType.includes('doc')) {
            try {
                await Linking.openURL(fileUri);
            } catch (error) {
                console.error("Error opening file URL:", error);
            }
        }
    };



    const handleDownloadFile = async (file) => {
        try {
            const response = await axios.post(`${BACKEND_URL}/file-data-thrower`, {
                username: user?.username ?? 'unknown',
                itemname: file?.name ?? 'unnamed-file',
            });

            const fileUrl = response.data.fileUrl;
            const fileType = response.data.fileType;
            const extension = getExtensionFromMime(fileType);
            if (!extension) throw new Error(`Unsupported file type: ${fileType}`);

            const fileName = `${file.name}.${extension}`;
            const localUri = FileSystem.documentDirectory + fileName;


            // Step 1: Download to app storage
            const { uri: downloadedUri, status } = await FileSystem.downloadAsync(fileUrl, localUri);
            if (status !== 200) throw new Error(`Download failed with status ${status}`);

            if (Platform.OS === 'android') {
                // Step 2: Ask SAF access
                const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                if (!permissions.granted) {
                    showWarningAlert("Permission Denied", "Please allow access to save the file.");
                    return;
                }

                const baseDir = permissions.directoryUri;

                // Step 3: Create/Get "Quick Docs" folder inside selected directory
                let quickDocsUri;
                try {
                    quickDocsUri = await FileSystem.StorageAccessFramework.createDirectoryAsync(baseDir, "Quick Docs");
                } catch (e) {
                    // Directory may already exist — try to get its URI by appending folder name
                    quickDocsUri = `${baseDir}/document/primary:Quick-Docs`;
                }

                // Step 4: Create file handle inside "Quick Docs"
                const safUri = await FileSystem.StorageAccessFramework.createFileAsync(
                    quickDocsUri,
                    fileName,
                    fileType
                );

                // Step 5: Read downloaded file
                const fileContent = await FileSystem.readAsStringAsync(downloadedUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                // Step 6: Write into SAF file
                await FileSystem.writeAsStringAsync(safUri, fileContent, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                showSuccessAlert("Download Completed", 'Successfully Saved to Quick Docs folder');

                if (deviceExpoNotificationToken) {
                    await sendPushNotification(
                        deviceExpoNotificationToken,
                        'Download Completed 📥',
                        `${fileName} saved in "Quick Docs" folder.`
                    );
                }
            }

        } catch (error) {
            console.error('Download Error:', error);
            showErrorAlert("Download Failed", error.message || "Could not download the file.");
        }
    };

    // Share File
    const handleShareFile = async (file) => {
        try {
            const fileUri = file.url; // assuming file.url is either local or remote

            if (fileUri.startsWith("file://")) {
                // File is already local
                await Sharing.shareAsync(fileUri);
            } else if (fileUri.startsWith("http://") || fileUri.startsWith("https://")) {
                // Download the file first
                const fileExtension = file.type || 'file';
                const fileName = file.name || `downloaded.${fileExtension}`;
                const localUri = FileSystem.documentDirectory + fileName;

                const downloadResumable = FileSystem.createDownloadResumable(
                    fileUri,
                    localUri
                );

                const { uri } = await downloadResumable.downloadAsync();
                await Sharing.shareAsync(uri);
            } else {
                throw new Error("Invalid file URI format");
            }

        } catch (error) {
            console.error('Error sharing file:', error);
            showErrorAlert("Sharing Failed", "Could not share the file. Try again.");
        }
    };


    const handleDeleteFile = async (item) => {

        let fileId = item._id;

        if (!fileId) {
            try {
                const response = await axios.post(`${BACKEND_URL}/file-data-thrower`, {
                    username: user?.username,
                    itemname: item.name,
                });

                fileId = response.data.fileId;
            } catch (err) {
                console.error('Error:', err.response?.data || err.message);
            }
        }


        showWarningAlert(
            "Confirm Deletion?",
            "Are you sure you want to delete this file? This action cannot be undone.",
            async () => {
                setIsDeleting(true);
                try {
                    setLoading(true);

                    const url = `${BACKEND_URL}/${fileId}?username=${user?.username}`;
                    const response = await fetch(url, {
                        method: 'DELETE',
                    });

                    const data = await response.json();
                    console.log(data)

                    if (!response.ok) {
                        throw new Error(data.message || 'Failed to delete file.');
                    }

                    // Update Zustand user store
                    useUserStore.getState().setUser(data.updatedUser);

                    //Sending Push Notification
                    if (deviceExpoNotificationToken) {
                        await sendPushNotification(
                            deviceExpoNotificationToken,
                            'File Deleted 🗑️😔',
                            `Feeling Sad, Rest in Peace ${item.name}`
                        );
                    }
                    console.log('Deleted Successfully')
                } catch (error) {
                    console.error('Error deleting file:', error);
                    showErrorAlert("Error", "Failed to delete File. Please try again.");

                } finally {
                    setLoading(false);
                    setIsDeleting(false);
                }

            }
        );
    };



    const filteredFiles = files.filter(file => {
        const fileName = file.name || '';
        const fileType = file.type || '';
        const fileRating = file.rating !== undefined && file.rating !== null ? file.rating : '';
        return (
            (selectedType === 'All' || fileType.toLowerCase().includes(selectedType.toLowerCase())) &&
            (
                fileName.toLowerCase().includes(searchText.toLowerCase()) ||
                fileType.toLowerCase().includes(searchText.toLowerCase()) ||
                String(fileRating).includes(searchText)
            )
        );
    });

    return (
        <LinearGradient colors={isDarkMode ? ['#0f0c29', '#302b63', '#24243e'] : ['#89f7fe', '#fad0c4']} style={[styles.container, isDarkMode && styles.darkContainer]}>
            <TextInput
                style={styles.searchBar}
                placeholder="Search by name, type, or rating..."
                value={searchText}
                onChangeText={setSearchText}
                placeholderTextColor="#666"
            />

            {/* Filters */}
            <View style={styles.filters}>
                {['All', 'PDF', 'DOCX', 'JPG', 'PNG', 'JPEG'].map(type => (
                    <TouchableOpacity
                        key={type}
                        style={[styles.filterButton, selectedType === type && styles.activeFilter]}
                        onPress={() => setSelectedType(type)}
                    >
                        <Text style={[styles.filterText, selectedType === type && styles.activeFilterText]}>
                            {type}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Loader */}
            {loading && (
                <View style={styles.lottieContainer}>
                    <LottieView
                        source={require('../../assets/loading.json')}
                        autoPlay
                        loop
                        speed={1.5}
                        style={styles.lottie}
                    />
                </View>
            )}

            {/* Files List using map instead of FlatList */}
            {!loading && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollViewContent}>
                    {filteredFiles.length > 0 ? (
                        filteredFiles.map((item, index) => (
                            <View key={index} style={[styles.fileCard, isDarkMode && styles.darkFileCard]}>
                                <TouchableOpacity
                                    onPress={() => handleShareFile(item)}
                                    style={{
                                        position: 'absolute',
                                        top: 15,
                                        right: 15,
                                        zIndex: 10,
                                    }}
                                >
                                    <MaterialIcons name="share" size={30} color="violet" />
                                </TouchableOpacity >
                                <View style={styles.previewContainer}>
                                    <View style={styles.previewBox}>
                                        {(
                                            <View style={styles.genericFile}>
                                                {
                                                    item.type.toLowerCase().includes('pdf') ?
                                                        <View style={styles.pdfdocxParentIcon}>
                                                            <Image source={require('../../assets/pdf.png')} style={styles.pdfdocxIcon} />
                                                        </View> :
                                                        (item.type.toLowerCase().includes('docx') ?
                                                            <View style={styles.pdfdocxParentIcon}>
                                                                <Image source={require('../../assets/doc_icon.png')} style={styles.pdfdocxIcon} />
                                                            </View>
                                                            : <Image source={{ uri: item.url }} style={styles.fileIcon} />)
                                                }
                                            </View>
                                        )}
                                    </View>

                                    {/* File Info */}
                                    <View style={styles.infoBox}>
                                        <Text numberOfLines={1} style={[styles.fileName, isDarkMode && styles.darkFileName]}>
                                            {item.name}
                                        </Text>
                                        <Text style={styles.rating}>🌟 {item.rating}</Text>
                                        <Text style={[styles.fileTypeLabel, isDarkMode && styles.darkFileTypeLabel]}>{item.type.toUpperCase()}</Text>
                                    </View>
                                </View>
                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity style={styles.viewButton} onPress={() => handleViewFile(item)}>
                                        <MaterialIcons name="visibility" size={20} color="white" />
                                        <Text style={styles.buttonText}>View</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.downloadButton} onPress={() => handleDownloadFile(item)}>
                                        <MaterialIcons name="file-download" size={20} color="white" />
                                        <Text style={styles.buttonText}>Download</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteFile(item)}>
                                        <MaterialIcons name="delete" size={20} color="white" />
                                        <Text style={styles.buttonText}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Image source={require('../../assets/NoDataFound.jpg')} style={styles.noDataFound} />
                            <Text style={[styles.emptyText, isDarkMode && styles.darkText]}>
                                No Files Found.
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Image Preview Modal */}
            <Modal visible={!!imagePreview} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <TouchableOpacity onPress={() => setImagePreview(null)} style={styles.closeButton}>
                        <MaterialIcons name="close" size={30} color="white" />
                    </TouchableOpacity>
                    {imagePreview &&
                        <Image source={{ uri: imagePreview }} style={styles.fullImage} />}
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
        </LinearGradient>
    );
};

// Styles
const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#F5F5F5' },
    darkContainer: { backgroundColor: '#121212' },
    searchBar: { height: 50, backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 15, marginBottom: 20 },
    filters: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 25 },
    filterButton: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, backgroundColor: 'lightgray' },
    activeFilter: { backgroundColor: '#007AFF' },
    filterText: { fontSize: scaleFont(12), fontWeight: 'bold' },
    activeFilterText: { color: 'white' },
    scrollViewContent: {
        paddingBottom: 20,
    },
    noDataFound: {
        width: 220,
        height: 220
    },
    fileCard: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
        marginHorizontal: 8,
        marginBottom: 20,
        alignItems: 'center',
        elevation: 3,
    },
    darkFileCard: {
        backgroundColor: '#121212',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,1)',
        elevation: 8,
        shadowColor: 'rgba(255, 255, 255, .6)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
    },
    fileDetails: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        padding: 15,
    },
    pdfdocxParentIcon: {
        height: 150,
        width: 150,
        justifyContent: 'center',
        alignItems: 'center'
    },
    pdfdocxIcon: {
        height: 110,
        width: 110,
        resizeMode: 'center',
    },
    fileDetailsLeft: {
        width: '50%',
        textAlign: 'center',
        alignContent: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: scaleFont(26)
    },
    fileDetailsRight: {
        width: '50%',
        textAlign: 'center',
        alignContent: 'center',
        justifyContent: 'center',
        alignItems: 'center',
    },
    filePreview: { width: 60, height: 60, marginBottom: 10, resizeMode: 'contain' },
    openInBrowserButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 5,
        marginTop: 20,
    },
    fileType: { fontSize: scaleFont(12), color: 'gray', marginBottom: 5 },
    previewContainer: {
        flexDirection: 'row',
        width: '100%',
        paddingVertical: 26,
        borderColor: '#ddd',
    },

    previewBox: {
        width: '50%',
        justifyContent: 'center',
        alignItems: 'center',
    },

    imageThumbnail: {
        width: 200,
        height: 200,
        borderRadius: 10,
        resizeMode: 'cover',
    },

    textPreview: {
        fontSize: scaleFont(14),
        color: '#333',
        textAlign: 'left',
        width: '100%',
    },
    darkTextPreview: {
        color: '#ccc'
    },
    genericFile: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    docxViewer: {
        flex: 1,
        width: '100%',
        backgroundColor: '#fff',
    },
    fileIcon: {
        width: 150,
        height: 150,
        resizeMode: 'contain',
    },

    fileTypeLabel: {
        marginTop: 5,
        fontSize: scaleFont(12),
        fontWeight: '600',
        color: '#666',
    },
    darkFileTypeLabel: {
        color: '#bbb'
    },

    infoBox: {
        flex: 1,
        paddingLeft: 10,
        justifyContent: 'center',
        gap: 10,
        width: '50%'
    },

    fileName: {
        fontWeight: 'bold',
        fontSize: scaleFont(18),
        color: '#333',
        marginBottom: 5,
    },
    darkFileName: {
        color: '#fff'
    },
    rating: {
        fontWeight: 'bold',
        color: '#00796b',
        fontSize: scaleFont(18),
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 6
    },
    viewButton: {
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        gap: 5,
        alignItems: 'center',
        flexDirection: 'row',
        padding: 10,
        borderRadius: 5,
        flex: 1,
    },
    downloadButton: {
        backgroundColor: '#00796b',
        justifyContent: 'center',
        gap: 5,
        alignItems: 'center',
        flexDirection: 'row',
        padding: 10,
        borderRadius: 5,
        flex: 1,
    },
    deleteButton: {
        backgroundColor: '#DC3545',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        padding: 10,
        borderRadius: 5,
        flex: 1,
    },
    buttonText: {
        fontSize: scaleFont(14),
        fontWeight: '600',
        color: 'white',
        marginLeft: 5,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
    },
    fullImage: {
        width: '90%',
        height: '80%',
        resizeMode: 'contain',
    },
    pdfViewer: {
        flex: 1,
        width: '100%',
        backgroundColor: '#fff',
    },
    docxViewer: {
        flex: 1,
        width: '100%',
        backgroundColor: '#fff',
    },
    lottieContainer: {
        flex: 1,
        justifyContent: 'start',
        alignItems: 'center',
    },
    lottie: {
        width: 200,
        height: 200,
        resizeMode: 'contain'
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: scaleFont(20),
        fontWeight: 600,
        color: 'black',
    },
    darkText: {
        color: '#ccc',
    },
});

export default ViewFilesScreen;