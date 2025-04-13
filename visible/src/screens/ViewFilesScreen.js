import React, { useState, useMemo, useEffect, useContext } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    StyleSheet,
    TextInput,
    ActivityIndicator,
    Dimensions,
    Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import * as Sharing from 'expo-sharing';
import { WebView } from 'react-native-webview'; // Import WebView
import LottieView from 'lottie-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import useUserStore from '../store/userStore';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

// Sample Files
const sampleFiles = [
    { id: 1, name: "Sample PDF", type: "pdf", rating: 3, local: require('../../assets/pdf.pdf') },
    { id: 2, name: "Sample Image", type: "jpeg", rating: 5, local: require('../../assets/raj.jpeg') },
];

// File Icons
const fileIcons = {
    pdf: require('../../assets/pdf.png'),
    docx: require('../../assets/doc_icon.png'),
    jpg: require('../../assets/image.png'),
    jpeg: require('../../assets/image.png'),
    png: require('../../assets/image.png'),
    webp: require('../../assets/image.png'),
};

// Get File Preview
const getFilePreview = (file) => {
    return fileIcons[file.type.toLowerCase()] || require('../../assets/file.png');
};

// Main Component  
const ViewFilesScreen = () => {
    const user = useUserStore((state) => state.user);
    const { isDarkMode } = useContext(ThemeContext);
    const [searchText, setSearchText] = useState('');
    const [selectedType, setSelectedType] = useState('All');
    const [loading, setLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [pdfUri, setPdfUri] = useState(null); // State to hold the PDF URI
    const [files, setFiles] = useState(sampleFiles);

    useEffect(() => {
        setLoading(true); // Start loading when searchText or selectedType changes

        // Simulate a loading delay (e.g., for fetching data)
        const timer = setTimeout(() => setLoading(false), 1000); // Set to 1000ms (1 second) for demo purposes

        return () => clearTimeout(timer); // Cleanup timeout on unmount
    }, [searchText, selectedType]);

    // Memoized Filtered Data
    const filteredFiles = useMemo(() => {
        return sampleFiles.filter(file =>
            (selectedType === 'All' || file.type.toLowerCase() === selectedType.toLowerCase()) &&
            (file.name.toLowerCase().includes(searchText.toLowerCase()) ||
                file.type.toLowerCase().includes(searchText.toLowerCase()) ||
                file.rating.toString().includes(searchText))
        );
    }, [searchText, selectedType]);

    // View File Function
    const handleViewFile = async (file) => {
        let fileUri = file.uri;

        if (file.local) {
            const asset = Asset.fromModule(file.local);
            await asset.downloadAsync();
            fileUri = asset.localUri;
        }

        if (file.type === "pdf") {
            const base64 = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            const pdfData = `data:application/pdf;base64,${base64}`;
            setPdfUri(pdfData);
        } else if (["jpg", "jpeg", "png", "webp"].includes(file.type)) {
            setImagePreview(fileUri);
        } else {
            console.warn("Unsupported file type. Download to view.");
        }
    };

    // Download File
    const handleDownloadFile = async (file) => {
        let fileUri = file.uri;

        if (file.local) {
            const asset = Asset.fromModule(file.local);
            await asset.downloadAsync();
            fileUri = asset.localUri;
        }

        try {
            await Sharing.shareAsync(fileUri);
        } catch (error) {
            console.error('Error downloading file:', error);
        }
    };

    const handleDeleteFile = (fileId) => {
        setFiles((prevFiles) => prevFiles.filter(file => file.id !== fileId));
    };

    return (
        <LinearGradient colors={isDarkMode ? ['#0f0c29', '#302b63', '#24243e'] : ['#89f7fe', '#fad0c4']} style={[styles.container, isDarkMode && styles.darkContainer]}>
            <TextInput
                style={styles.searchBar}
                placeholder="Search by name, type, or rating..."
                value={searchText}
                onChangeText={setSearchText}
            />

            {/* Filters */}
            <View style={styles.filters}>
                {['All', 'PDF', 'DOCX', 'JPG', 'PNG', 'WEBP'].map(type => (
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
            {loading &&
                <View style={styles.lottieContainer}>
                    <LottieView
                        source={require('../../assets/loading.json')}
                        autoPlay
                        loop
                        speed={1.5}
                        style={styles.lottie}
                    />
                </View>
            }

            {/* File List */}
            {!loading && (
                <FlatList
                    nestedScrollEnabled={true} // Fixes the nested scrolling issue
                    data={files.filter(file =>
                        (selectedType === 'All' || file.type.toLowerCase() === selectedType.toLowerCase()) &&
                        (file.name.toLowerCase().includes(searchText.toLowerCase()) ||
                            file.type.toLowerCase().includes(searchText.toLowerCase()) ||
                            file.rating.toString().includes(searchText))
                    )}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={1}
                    renderItem={({ item }) => (
                        <View style={[styles.fileCard, isDarkMode && styles.darkFileCard]}>
                            <Text style={styles.fileName}>{item.name}</Text>
                            <Image source={getFilePreview(item)} style={styles.filePreview} />
                            <Text style={styles.fileType}>{item.type.toUpperCase()}</Text>
                            <Text style={styles.rating}>⭐ {item.rating}</Text>
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity style={styles.viewButton} onPress={() => handleViewFile(item)}>
                                    <MaterialIcons name="visibility" size={20} color="white" />
                                    <Text style={styles.buttonText}>View</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.downloadButton} onPress={() => handleDownloadFile(item)}>
                                    <MaterialIcons name="file-download" size={20} color="white" />
                                    <Text style={styles.buttonText}>Download</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteFile(item.id)}>
                                    <MaterialIcons name="delete" size={20} color="white" />
                                    <Text style={styles.buttonText}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                />
            )}

            {/* Image Preview Modal */}
            <Modal visible={!!imagePreview} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <TouchableOpacity onPress={() => setImagePreview(null)} style={styles.closeButton}>
                        <MaterialIcons name="close" size={30} color="white" />
                    </TouchableOpacity>
                    {imagePreview && <Image source={{ uri: imagePreview }} style={styles.fullImage} />}
                </View>
            </Modal>

            {/* PDF Viewer Modal */}
            <Modal visible={!!pdfUri} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <TouchableOpacity onPress={() => setPdfUri(null)} style={styles.closeButton}>
                        <MaterialIcons name="close" size={30} color="white" />
                    </TouchableOpacity>
                    {pdfUri && (
                        <WebView
                            source={{ uri: pdfUri }}
                            style={styles.pdfViewer}
                            originWhitelist={['*']}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                        />
                    )}
                </View>
            </Modal>
        </LinearGradient>
    );
};

// Styles
const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#F5F5F5' },
    darkContainer: { backgroundColor: '#121212' },
    searchBar: { height: 50, backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 15, marginBottom: 10 },
    filters: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 },
    filterButton: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, backgroundColor: 'lightgray' },
    activeFilter: { backgroundColor: '#007AFF' },
    filterText: { fontSize: 14, fontWeight: 'bold' },
    activeFilterText: { color: 'white' },
    fileCard: { flex: 1, backgroundColor: 'white', borderRadius: 10, padding: 15, margin: 8, alignItems: 'center', elevation: 3 },
    darkFileCard: { backgroundColor: '#121212', borderWidth: 1, borderColor: 'rgba(255,255,255,1)', elevation: 8, shadowColor: 'rgba(255, 255, 255, .6)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, },
    filePreview: { width: 60, height: 60, marginBottom: 10, resizeMode: 'contain' },
    fileName: { fontWeight: 'bold', fontSize: 16, marginBottom: 5, textAlign: 'center' },
    fileType: { fontSize: 12, color: 'gray', marginBottom: 5 },
    rating: { fontWeight: 'bold', color: '#00796b', marginBottom: 10 },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    viewButton: { backgroundColor: '#007AFF', justifyContent: 'center', gap: '5', alignItems: 'center', flexDirection: 'row', padding: 10, borderRadius: 5, flex: 1, marginRight: 5 },
    downloadButton: { backgroundColor: '#00796b', justifyContent: 'center', gap: '5', alignItems: 'center', flexDirection: 'row', padding: 10, borderRadius: 5, flex: 1, marginLeft: 5 },
    modalContainer: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
    closeButton: { position: 'absolute', top: 40, right: 20 },
    fullImage: { width: '90%', height: '80%', resizeMode: 'contain' },
    pdfViewer: {
        flex: 1,
        width: '90%',
        height: '80%',
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
    deleteButton: {
        backgroundColor: '#DC3545', // Red color for delete
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        padding: 10,
        borderRadius: 5,
        flex: 1,
        marginLeft: 5,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
        marginLeft: 5,
    },
});

export default ViewFilesScreen;
