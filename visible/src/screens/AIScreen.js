import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
import {
    Text,
    View,
    Image,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Vibration,
    Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from "expo-av";
import axios from 'axios';
import LottieView from 'lottie-react-native';
import { useNavigation } from "@react-navigation/native";

// Assets and Components
import AI from '../../assets/robo1.jpg';
import Human from '../../assets/squad.jpg';
import Stars1 from '../../assets/stars1.png';
import Stars2 from '../../assets/stars2.png';
import FadeInText from '../components/FadeInText';

// Context and Hooks
import { ThemeContext } from '../context/ThemeContext';
import useUserStore from '../store/userStore';
import useThemedStatusBar from '../hooks/StatusBar';

// Icons
import CrownIcon from 'react-native-vector-icons/FontAwesome5';
import MicIcon from 'react-native-vector-icons/FontAwesome5';
import StopIcon from 'react-native-vector-icons/MaterialIcons';

// Environment
import { BACKEND_URL } from '@env';

const ProfileScreen = () => {
    // State Management
    const [messages, setMessages] = useState([
        {
            id: '1',
            role: 'assistant',
            text: 'Hello! I am Agent QD, your intelligent assistant. How can I help you today?',
            loading: false,
            timestamp: new Date().toISOString()
        }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isWaiting, setIsWaiting] = useState(false);
    const [isStopped, setIsStopped] = useState(false);
    const [promptLimit, setPromptLimit] = useState(false);

    // Voice Recognition States
    const [micOn, setMicOn] = useState(false);
    const [recording, setRecording] = useState(null);
    const [transcript, setTranscript] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisText, setAnalysisText] = useState('🎤 Processing your voice...');
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);

    // Translation State Variables
    const [detectedLanguage, setDetectedLanguage] = useState(null);
    const [translationInfo, setTranslationInfo] = useState(null);
    const [showLanguageInfo, setShowLanguageInfo] = useState(false);

    // Animation Values
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const micButtonScale = useRef(new Animated.Value(1)).current;

    // Context and Hooks
    const { isDarkMode } = useContext(ThemeContext);
    const user = useUserStore((state) => state.user);
    const navigation = useNavigation();
    const scrollRef = useRef(null);
    const abortControllerRef = useRef(null);

    useThemedStatusBar(isDarkMode);

    // Analysis steps for voice processing feedback
    const analysisSteps = [
        "🎤 Processing your voice...",
        "🧠 Understanding context...",
        "📝 Preparing response..."
    ];

    // Blocked keywords for content filtering
    const blockedKeywords = [
        "generate code", "write code", "give me code", "create an app", "build an app",
        "weather in", "what is the weather", "current weather", "app prompt",
        "how to code", "GPT plugin", "generate a project", "open source",
        "location in", "my location", "hack", "illegal", "virus"
    ];

    // Effects
    useEffect(() => {
        checkPromptLimitations();
    }, [user?.premiumDetails, user?.aipromptscount]);

    useEffect(() => {
        let interval;
        if (isAnalyzing) {
            let stepIndex = 0;
            interval = setInterval(() => {
                setAnalysisText(analysisSteps[stepIndex]);
                stepIndex = (stepIndex + 1) % analysisSteps.length;
            }, 1000);

            // Pulse animation during analysis
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            setAnalysisText('🎤 Processing your voice...');
            pulseAnim.setValue(1);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isAnalyzing]);

    // Helper Functions
    const checkPromptLimitations = useCallback(() => {
        const planNames = Array.isArray(user?.premiumDetails)
            ? user.premiumDetails.map(p => p?.type || '')
            : [];

        let allowedPrompts = 3;

        if (planNames.some(name => name.includes('Ultra Pro Max'))) {
            allowedPrompts = Infinity;
        } else if (planNames.some(name => name.includes('Ultra Pro'))) {
            allowedPrompts = 10;
        }

        if ((user?.aipromptscount ?? 0) >= allowedPrompts) {
            setPromptLimit(true);
        }
    }, [user?.premiumDetails, user?.aipromptscount]);

    const cleanBotResponse = (text) => {
        return text
            .replace(/\*\*\*/g, '')
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/[_~`]/g, '')
            .trim();
    };

    const isBlockedPrompt = (prompt) => {
        if (typeof prompt !== 'string') return false;
        const lowerPrompt = prompt.toLowerCase();
        return blockedKeywords.some(keyword => lowerPrompt.includes(keyword.toLowerCase()));
    };

    const generateMessageId = () => {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    };

    // Voice Recognition Functions
    const startRecording = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== "granted") {
                Alert.alert(
                    "Permission Required",
                    "Microphone access is required for voice input.",
                    [{ text: "OK" }]
                );
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
            );

            setRecording(recording);

            // Haptic feedback
            if (Platform.OS === 'ios') {
                Vibration.vibrate(50);
            }

            // Animate mic button
            Animated.spring(micButtonScale, {
                toValue: 1.2,
                useNativeDriver: true,
            }).start();

        } catch (err) {
            console.error("Failed to start recording", err);
            Alert.alert("Error", "Failed to start recording. Please try again.");
        }
    };

    const stopRecording = async () => {
        try {
            if (!recording) return;

            setIsProcessingVoice(true);

            // Reset mic button animation
            Animated.spring(micButtonScale, {
                toValue: 1,
                useNativeDriver: true,
            }).start();

            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);

            setIsAnalyzing(true);

            // Upload and transcribe audio with language detection
            const formData = new FormData();
            formData.append("audio", {
                uri: uri,
                name: "audio.3gp",
                type: "audio/3gpp",
            });

            const response = await axios.post(
                `${BACKEND_URL}/transcribe-audio`,
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                    timeout: 30000
                }
            );

            const { transcript, detectedLanguage: detectedLang, translationInfo: transInfo, confidence } = response.data;

            // Update states with language information
            console.log(detectedLang)
            setDetectedLanguage(detectedLang);
            setTranslationInfo(transInfo);
            setTranscript(transcript);

            // Show language detection info if not English
            if (detectedLang && detectedLang !== 'en-US' && transInfo?.wasTranslated) {
                setShowLanguageInfo(true);
                // Auto-hide after 5 seconds
                setTimeout(() => setShowLanguageInfo(false), 5000);
            }

            if (transcript) {
                if (inputMessage) {
                    setInputMessage(inputMessage + " " + transcript);
                } else {
                    setInputMessage(transcript);
                }
                setTimeout(() => setIsAnalyzing(false), 200);
                setIsProcessingVoice(false);
            }

        } catch (err) {
            console.error("Error stopping/uploading recording:", err);
            Alert.alert("Error", "Failed to process voice input. Please try again.");
            setIsAnalyzing(false);
            setIsProcessingVoice(false);

            // Reset language info on error
            setDetectedLanguage(null);
            setTranslationInfo(null);
            setShowLanguageInfo(false);
        }
    };

    // Add this helper function for language names
    const getLanguageName = (languageCode) => {
        const languageNames = {
            'en-US': 'English',
            'hi-IN': 'Hindi',
            'te-IN': 'Telugu'
        };

        return languageNames[languageCode] || languageCode;
    };


    const handleMicPress = async () => {
        if (micOn) {
            await stopRecording();
        } else {
            await startRecording();
        }
        setMicOn(!micOn);
    };

    // Message Functions
    const sendMessage = async () => {
        const { user, incrementPromptCount } = useUserStore.getState();

        if (!user) {
            Alert.alert("Error", "Please log in to continue.");
            return;
        }

        if (!inputMessage.trim() || isWaiting) return;

        const userMessage = {
            id: generateMessageId(),
            role: 'user',
            text: inputMessage.trim(),
            timestamp: new Date().toISOString()
        };

        // Check for blocked content
        if (isBlockedPrompt(inputMessage)) {
            setMessages((prev) => [...prev, userMessage]);
            setInputMessage('');
            setIsWaiting(true);
            setIsAnalyzing(false);

            setTimeout(() => {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: generateMessageId(),
                        role: "assistant",
                        text: "I apologize, but I can only assist with general questions. I cannot help with app development, coding, weather queries, or potentially harmful content.",
                        timestamp: new Date().toISOString()
                    },
                ]);
                setIsWaiting(false);
            }, 2000);

            return;
        }

        setMessages((prev) => [...prev, userMessage]);
        setInputMessage('');
        setIsWaiting(true);
        setIsStopped(false);
        setIsAnalyzing(false);

        const loadingMessage = {
            id: generateMessageId(),
            role: 'assistant',
            text: '',
            loading: true,
            timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, loadingMessage]);

        abortControllerRef.current = new AbortController();

        try {
            // Check prompt limitations
            const promptRes = await fetch(`${BACKEND_URL}/check-prompt-limitation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user?.username }),
            });

            const promptData = await promptRes.json();

            if (!promptRes.ok) {
                if (promptData?.message === 'Prompt limit reached') {
                    setPromptLimit(true);
                    setTimeout(() => {
                        setMessages((prev) =>
                            prev.map((msg, index) =>
                                index === prev.length - 1
                                    ? {
                                        ...msg,
                                        text: '🚫 Sorry! You\'ve reached your daily limit. Upgrade to premium for unlimited access to Agent QD.',
                                        loading: false
                                    }
                                    : msg
                            )
                        );
                        setIsWaiting(false);
                    }, 2000);
                    return;
                } else {
                    throw new Error(promptData.message || 'Prompt check failed');
                }
            }

            incrementPromptCount();

            // Generate AI response
            const response = await generateBotResponse([...messages, userMessage], abortControllerRef.current.signal);

            if (isStopped) return;

            const rawResponse = response?.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I couldn\'t process your request. Please try again.';
            const botResponse = cleanBotResponse(rawResponse);

            setMessages((prev) =>
                prev.map((msg, index) =>
                    index === prev.length - 1
                        ? {
                            ...msg,
                            text: botResponse,
                            loading: false,
                            timestamp: new Date().toISOString()
                        }
                        : msg
                )
            );

        } catch (error) {
            if (error.name === 'AbortError') {
                setMessages((prev) => prev.filter((msg) => !(msg.loading && msg.role === 'assistant')));
            } else {
                console.error('Send message error:', error);
                setMessages((prev) =>
                    prev.map((msg, index) =>
                        index === prev.length - 1
                            ? {
                                ...msg,
                                text: '⚠️ Something went wrong. Please check your connection and try again.',
                                loading: false
                            }
                            : msg
                    )
                );
            }
        } finally {
            setIsWaiting(false);
        }
    };

    const generateBotResponse = async (history, signal) => {
        const latestUserMessage = history[history.length - 1]?.text;

        try {
            const response = await fetch(`${BACKEND_URL}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal,
                body: JSON.stringify({
                    username: user?.username,
                    question: latestUserMessage,
                    userfullname: user?.name,
                    email: user?.email,
                    dob: user?.dob,
                    gender: user?.gender,
                    ispremiumuser: user?.premiumuser,
                    numberoffilesuploaded: user?.myfiles?.length || 0
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                candidates: [{
                    content: {
                        parts: [{ text: data.answer }]
                    }
                }]
            };
        } catch (error) {
            console.error('Error fetching response:', error);
            throw error;
        }
    };

    const stopResponse = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsStopped(true);
        setIsWaiting(false);
    };

    const renderLanguageInfo = () => {
        if (!showLanguageInfo || !translationInfo) return null;

        return (
            <Animated.View
                style={[
                    styles.languageInfoBanner,
                    { backgroundColor: isDarkMode ? 'rgba(0, 121, 107, 0.9)' : 'rgba(0, 121, 107, 0.1)' }
                ]}
            >
                <View style={styles.languageInfoContent}>
                    <Text style={[styles.languageInfoIcon]}>🌐</Text>
                    <View style={styles.languageInfoText}>
                        <Text style={[styles.languageInfoTitle, { color: isDarkMode ? '#fff' : '#00796b' }]}>
                            Language Detected: {getLanguageName(translationInfo.originalLanguage)}
                        </Text>
                        {translationInfo.wasTranslated && (
                            <Text style={[styles.languageInfoSubtitle, { color: isDarkMode ? '#ccc' : '#666' }]}>
                                Automatically translated to English
                            </Text>
                        )}
                    </View>
                    <TouchableOpacity
                        onPress={() => setShowLanguageInfo(false)}
                        style={styles.closeButton}
                    >
                        <Text style={styles.closeButtonText}>×</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        );
    };

    // Render Functions
    const renderMessage = (item, index) => (
        <View
            key={item.id || `message-${index}`}
            style={item.role === 'user' ? styles.HumanMessage : styles.AIMessage}
        >
            <View style={item.role === 'user' ? styles.HumanMsgLogoParent : styles.AIMsgLogoParent}>
                <Image
                    source={
                        item.role === 'user'
                            ? user?.profileImageUrl
                                ? { uri: user?.profileImageUrl }
                                : require('../../assets/updatedLogo1.png')
                            : AI
                    }
                    style={styles.miniLogo}
                />
            </View>

            <View style={item.role === 'user' ? styles.HumanTextParent : styles.RoboTextParent}>
                {item.loading && item.role === 'assistant' ? (
                    <View style={styles.loadingContainer}>
                        <LottieView
                            source={require('../../assets/AI_Loader.json')}
                            autoPlay={true}
                            loop={true}
                            speed={1.5}
                            style={styles.loader}
                        />
                    </View>
                ) : (
                    <View style={item.role === 'user' ? styles.HumanMessageContainer : styles.RoboMessageContainer}>
                        {item.role === 'assistant' ? (
                            <FadeInText style={[styles.AIText, { flexWrap: 'wrap' }]}>
                                {item.text}
                            </FadeInText>
                        ) : (
                            <Text style={styles.UserText}>{item.text}</Text>
                        )}
                    </View>
                )}
            </View>
        </View>
    );

    const renderInputSection = () => {
        if (!user?.premiumuser || promptLimit) {
            return (
                <TouchableOpacity
                    style={[styles.premiumButton, { backgroundColor: isDarkMode ? 'rgba(255, 81, 0, 0.74)' : '#E9A319' }]}
                    onPress={() => navigation.navigate('Premium')}
                >
                    <View style={styles.buttonStylings}>
                        <CrownIcon name="crown" size={24} color="#FFD700" />
                        <Text style={[styles.buttonText, isDarkMode && { color: '#FFF085' }]}>
                            Upgrade to Premium for Agent QD
                        </Text>
                    </View>
                </TouchableOpacity>
            );
        }

        return (
            <View style={styles.inputRow}>
                <Animated.View style={{ transform: [{ scale: micButtonScale }] }}>
                    <TouchableOpacity
                        onPress={handleMicPress}
                        disabled={isProcessingVoice}
                        style={[
                            styles.micButton,
                            {
                                backgroundColor: isProcessingVoice ? 'red' : (micOn ? '#00796b' : '#F1EFEC'),
                                borderWidth: (micOn ? 2 : 0),
                                borderColor: '#00796b',
                            }
                        ]}
                    >
                        {micOn ? (
                            <MicIcon name="microphone" size={20} color="white" />
                        ) : (
                            <MicIcon name="microphone-slash" size={20} color="black" />
                        )}
                    </TouchableOpacity>
                </Animated.View>

                <View style={styles.inputWrapper}>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <TextInput
                            style={[
                                styles.input,
                                isAnalyzing && styles.inputAnalyzing
                            ]}
                            placeholder={isAnalyzing ? analysisText : "Ask your queries to Agent QD..."}
                            placeholderTextColor={isAnalyzing ? "#00796b" : "grey"}
                            value={inputMessage}
                            onChangeText={setInputMessage}
                            editable={!isWaiting && !isAnalyzing}
                        //  multiline={true} maxLength={500}
                        />
                    </Animated.View>
                </View>

                {!isWaiting ? (
                    <TouchableOpacity
                        style={[styles.sendButton, isAnalyzing && styles.sendButtonDisabled]}
                        onPress={sendMessage}
                        disabled={isAnalyzing || !inputMessage.trim()}
                    >
                        <Image source={Stars2} style={styles.sendIcon} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.stopButton} onPress={stopResponse}>
                        <StopIcon name="stop" size={20} color="white" />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <LinearGradient
            colors={isDarkMode ? ['#0f0c29', '#302b63', '#24243e'] : ['#89f7fe', '#fad0c4']}
            style={styles.container}
        >
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <LottieView
                        source={require('../../assets/AI_Intro_Loader.json')}
                        autoPlay={true}
                        loop={true}
                        speed={1}
                        style={styles.headerLottie}
                    />
                    <View style={styles.headerTextContainer}>
                        <Text style={[styles.headerTitle, { color: isDarkMode ? '#fff' : '#00796b' }]}>
                            Agent QD
                        </Text>
                        <Text style={[styles.headerSubtitle, { color: isDarkMode ? '#ccc' : '#666' }]}>
                            Your AI Assistant
                        </Text>
                    </View>
                </View>

                {renderLanguageInfo()}

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={65}
                    style={styles.keyboardAvoidingView}
                >
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.chatContainer}
                        ref={scrollRef}
                        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                    >
                        {messages.map(renderMessage)}
                    </ScrollView>

                    <View style={styles.inputContainer}>
                        {renderInputSection()}
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
};


const additionalStyles = StyleSheet.create({
    languageInfoBanner: {
        position: 'absolute',
        top: 160, // Adjust based on your header height
        left: 16,
        right: 16,
        borderRadius: 12,
        padding: 12,
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    languageInfoContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    languageInfoIcon: {
        fontSize: 20,
        marginRight: 10,
    },
    languageInfoText: {
        flex: 1,
    },
    languageInfoTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    languageInfoSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    closeButton: {
        padding: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    closeButtonText: {
        fontSize: 18,
        color: '#fff',
        fontWeight: 'bold',
        textAlign: 'center',
        minWidth: 20,
    },
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        paddingVertical: 20,
        paddingHorizontal: 16,
    },
    headerLottie: {
        width: 160,
        height: 160,
        marginRight: 12,
    },
    headerTextContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 36,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 16,
        marginTop: 2,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    chatContainer: {
        flexGrow: 1,
        padding: 16,
        paddingBottom: 130,
    },
    AIMessage: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginVertical: 8,
        marginRight: 10,
    },
    AIMsgLogoParent: {
        marginRight: 12,
    },
    RoboTextParent: {
        maxWidth: '80%',
        flex: 1,
    },
    RoboMessageContainer: {
        backgroundColor: '#EAF4FC',
        padding: 16,
        borderRadius: 20,
        borderTopLeftRadius: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 3,
    },
    AIText: {
        color: '#2c3e50',
        fontWeight: '500',
        fontSize: 16,
        lineHeight: 22,
    },
    HumanMessage: {
        flexDirection: 'row-reverse',
        alignItems: 'flex-start',
        marginVertical: 8,
        marginLeft: 10,
    },
    HumanTextParent: {
        maxWidth: '80%',
    },
    HumanMessageContainer: {
        backgroundColor: '#FFE4B5',
        padding: 16,
        borderRadius: 20,
        borderTopRightRadius: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 3,
    },
    UserText: {
        color: '#2c3e50',
        fontWeight: '500',
        fontSize: 16,
        lineHeight: 22,
    },
    HumanMsgLogoParent: {
        marginLeft: 12,
    },
    miniLogo: {
        width: 40,
        height: 40,
        borderRadius: 22.5,
        borderWidth: 2,
        borderColor: '#fff',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EAF4FC',
        padding: 16,
        borderRadius: 20,
        borderTopLeftRadius: 4,
    },
    loader: {
        height: 40,
        width: 40,
        marginRight: 8,
    },
    loadingText: {
        color: '#00796b',
        fontStyle: 'italic',
        fontSize: 14,
    },
    inputContainer: {
        position: 'absolute',
        bottom: 65,
        left: 16,
        right: 16,
        backgroundColor: 'white',
        borderRadius: 30,
        paddingHorizontal: 8,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    premiumButton: {
        paddingVertical: 10,
        borderRadius: 25,
        width: '100%',
    },
    buttonStylings: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10
    },
    micButton: {
        height: 50,
        width: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    inputWrapper: {
        flex: 1,
        position: 'relative',
    },
    input: {
        flex: 1,
        height: 50,
        paddingHorizontal: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 25,
        fontSize: 16,
        color: '#333',
        borderWidth: 0,
        textAlignVertical: 'center',
    },
    inputAnalyzing: {
        borderColor: '#00796b',
        borderWidth: 2,
        backgroundColor: '#f8fffe',
    },
    analysisIndicator: {
        position: 'absolute',
        right: 0,
        top: '50%',
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#00796b',
        marginHorizontal: 2,
    },
    dot1: { opacity: 1 },
    dot2: { opacity: 0.7 },
    dot3: { opacity: 0.4 },
    sendButton: {
        backgroundColor: '#FFB22C',
        borderRadius: 25,
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sendButtonDisabled: {
        opacity: 0.6,
    },
    sendIcon: {
        height: 24,
        width: 24,
    },
    stopButton: {
        backgroundColor: '#e74c3c',
        borderRadius: 30,
        paddingVertical: 13,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    stopButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default ProfileScreen;