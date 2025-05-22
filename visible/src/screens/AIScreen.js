import React, { useState, useContext, useRef, useEffect } from 'react';
import { Text, View, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import AI from '../../assets/robo1.jpg'; // Ensure this path is correct
// import Human from '../../assets/squad.jpg'; // This was in your original, but user profile image is now dynamic
import { ThemeContext } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context'; // Use from react-native-safe-area-context
import LottieView from 'lottie-react-native';
// import Stars1 from '../../assets/stars1.png'; // Not used in this version
import Stars2 from '../../assets/stars2.png'; // Ensure this path is correct
import { LinearGradient } from 'expo-linear-gradient';
import useUserStore from '../store/userStore';
import { useNavigation } from "@react-navigation/native"
import FadeInText from '../components/FadeInText';
import useThemedStatusBar from '../hooks/StatusBar';
import CrownIcon from 'react-native-vector-icons/FontAwesome5';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // For the microphone icon
import * as Speech from 'expo-speech'; // Keep if you plan to use text-to-speech for AI response
import * as SpeechRecognition from 'expo-speech-recognition';
import { BACKEND_URL } from '@env'; // Make sure you have babel-plugin-dotenv-import or similar for @env to work

const GOOGLE_TRANSLATE_API_ENDPOINT = `${BACKEND_URL}/translate-speech`; // Example backend endpoint

const AI_Support = () => {
    const [messages, setMessages] = useState([{ role: 'assistant', text: 'Hello! I am Agent QD, How can I assist you today?', loading: false }]);
    const [inputMessage, setInputMessage] = useState('');
    const [isWaiting, setIsWaiting] = useState(false);
    const [isStopped, setIsStopped] = useState(false);
    const [promptLimit, setPromptLimit] = useState(false)
    const [isListening, setIsListening] = useState(false);
    const { isDarkMode } = useContext(ThemeContext);
    const user = useUserStore((state) => state.user);
    const navigation = useNavigation()
    const scrollRef = useRef(null);
    const abortControllerRef = useRef(null);
    useThemedStatusBar(isDarkMode)

    useEffect(() => {
        // Scroll to end when messages update
        if (scrollRef.current) {
            setTimeout(() => {
                scrollRef.current.scrollToEnd({ animated: true });
            }, 100); // Small delay to allow layout to settle
        }
    }, [messages]);


    useEffect(() => {
        const planNames = Array.isArray(user?.premiumDetails)
            ? user.premiumDetails.map(p => p?.type || '')
            : [];

        let allowedPrompts = 3; // Default for non-premium

        if (planNames.some(name => name.includes('Ultra Pro Max'))) {
            allowedPrompts = Infinity;
        } else if (planNames.some(name => name.includes('Ultra Pro'))) {
            allowedPrompts = 10;
        }

        if ((user?.aipromptscount ?? 0) >= allowedPrompts) {
            setPromptLimit(true);
        } else {
            setPromptLimit(false); // Reset if user becomes premium or count is less than limit
        }
    }, [user?.premiumDetails, user?.aipromptscount]);

    useEffect(() => {
        (async () => {
            const { status } = await SpeechRecognition.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Speech recognition needs microphone permission to work.');
            }
        })();

        // Clean up listeners on unmount
        return () => {
            SpeechRecognition.removeListener('onSpeechResults', () => {});
            SpeechRecognition.removeListener('onSpeechEnd', () => {});
            SpeechRecognition.removeListener('onSpeechError', () => {});
            SpeechRecognition.stopAsync().catch(() => {}); // Attempt to stop if active
        };
    }, []);

    const cleanBotResponse = (text) => {
        return text
            .replace(/\*\*\*/g, '')
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/[_~`]/g, '')
            .trim();
    };

    const blockedKeywords = [
        "generate code", "write code", "give me code", "create an app", "build an app",
        "weather in", "what is the weather", "current weather", "app prompt", "how to code",
        "GPT plugin", "generate a project", "open source", "location in", "my location",
    ];

    function isBlockedPrompt(prompt) {
        if (typeof prompt !== 'string') return false;
        const lowerPrompt = prompt.toLowerCase();
        return blockedKeywords.some((keyword) => lowerPrompt.includes(keyword));
    }

    const sendMessage = async () => {
        const { user: currentUser, incrementPromptCount } = useUserStore.getState();

        if (!currentUser) {
            Alert.alert("User Not Found", "Please log in to use Agent QD.");
            return;
        }

        if (!inputMessage.trim() || isWaiting) return;

        const userMessage = { role: 'user', text: inputMessage };

        if (isBlockedPrompt(inputMessage)) {
            setMessages((prev) => [...prev, userMessage]);
            setInputMessage('');
            setIsWaiting(true);

            setTimeout(() => {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        text: "Sorry, I can only respond to general questions. I cannot assist with app prompts, coding, or weather-related queries.",
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

        const loadingMessage = { role: 'assistant', text: '', loading: true };
        setMessages((prev) => [...prev, loadingMessage]);

        abortControllerRef.current = new AbortController();

        try {
            const promptRes = await fetch(`${BACKEND_URL}/check-prompt-limitation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUser?.username }),
                signal: abortControllerRef.current.signal, // Allow aborting this fetch too
            });

            const promptData = await promptRes.json();
            if (!promptRes.ok) {
                if (promptData?.message === 'Prompt limit reached') {
                    setPromptLimit(true)
                    // Update only the last message if it's the loading message
                    setMessages((prev) =>
                        prev.map((msg, index) =>
                            index === prev.length - 1 && msg.loading && msg.role === 'assistant'
                                ? { role: 'assistant', text: 'Ohh God! I am Sorry Buddy, Your Limit has Reached, Explore our Budget Friendly Premiums and Purchase them to Enjoy our Valuable Services', loading: false }
                                : msg
                        )
                    );
                    return; // Stop further processing
                } else {
                    throw new Error(promptData.message || 'Prompt check failed');
                }
            }

            // Only increment if the prompt check was successful
            incrementPromptCount();

            // Proceed with AI service call only if not stopped
            if (!isStopped) {
                const response = await generateBotResponse([...messages, userMessage], abortControllerRef.current.signal);
                const rawResponse = response?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not understand that.';
                const botResponse = cleanBotResponse(rawResponse);

                setMessages((prev) =>
                    prev.map((msg, index) =>
                        index === prev.length - 1 && msg.loading && msg.role === 'assistant'
                            ? { role: 'assistant', text: botResponse, loading: false }
                            : msg
                    )
                );
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                // If aborted, remove the loading message and don't show an error
                setMessages((prev) => prev.filter((msg) => !(msg.loading && msg.role === 'assistant')));
            } else {
                console.error("Error in sendMessage:", error);
                // Update only the last message if it's the loading message
                setMessages((prev) =>
                    prev.map((msg, index) =>
                        index === prev.length - 1 && msg.loading && msg.role === 'assistant'
                            ? { role: 'assistant', text: 'Oops, something went wrong. Please try again later.', loading: false }
                            : msg
                    )
                );
            }
        } finally {
            setIsWaiting(false);
            setIsStopped(false); // Reset stopped state
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
                    numberoffilesuploaded: user?.myfiles.length
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Backend AI response failed');
            }
            return {
                candidates: [{
                    content: {
                        parts: [{ text: data.answer }]
                    }
                }]
            };
        } catch (error) {
            console.error('Error fetching AI response from backend:', error);
            throw error;
        }
    };

    const stopResponse = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort(); // Abort the fetch requests
        }
        setIsStopped(true);
        setIsWaiting(false);
        // Remove the loading message immediately
        setMessages((prev) => prev.filter((msg) => !(msg.loading && msg.role === 'assistant')));
    };

    // --- Speech-to-Text and Translation Logic ---
    const startListening = async () => {
        const isAvailable = await SpeechRecognition.isAvailableAsync();
        if (!isAvailable) {
            Alert.alert('Speech Recognition Not Available', 'Your device does not support speech recognition.');
            return;
        }

        const hasPermission = await SpeechRecognition.hasPermissionAsync();
        if (!hasPermission.granted) {
            const { status } = await SpeechRecognition.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Microphone permission is required for speech-to-text.');
                return;
            }
        }

        try {
            setIsListening(true);
            setInputMessage('Listening...'); // Indicate listening state in input field

            // Clear previous listeners to avoid duplicates
            SpeechRecognition.removeAllListeners();

            // Set up listeners for speech recognition events
            SpeechRecognition.addListener('onSpeechResults', async ({ results }) => {
                if (results && results.length > 0) {
                    const spokenText = results[0]; // Get the most confident result
                    console.log("Spoken Text:", spokenText);

                    // Send spoken text to your backend for translation
                    try {
                        const translationResponse = await fetch(GOOGLE_TRANSLATE_API_ENDPOINT, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                text: spokenText,
                                targetLanguage: 'en', // Always translate to English
                            }),
                        });

                        const translationData = await translationResponse.json();
                        if (translationResponse.ok && translationData.translatedText) {
                            setInputMessage(translationData.translatedText);
                        } else {
                            console.error('Translation failed:', translationData.error || 'Unknown error');
                            setInputMessage(spokenText); // Fallback to original text if translation fails
                        }
                    } catch (error) {
                        console.error('Error during translation API call:', error);
                        setInputMessage(spokenText); // Fallback to original text on network error
                    }
                }
            });

            SpeechRecognition.addListener('onSpeechEnd', () => {
                console.log("Speech recognition ended.");
                setIsListening(false);
                // If no text was captured, clear "Listening..." message
                if (inputMessage === 'Listening...') {
                    setInputMessage('');
                }
            });

            SpeechRecognition.addListener('onSpeechError', (error) => {
                console.error('Speech Recognition Error:', error);
                setIsListening(false);
                setInputMessage(''); // Clear input on error
                Alert.alert('Speech Error', 'Could not process speech. Please try again.');
            });

            // Start the recognition
            await SpeechRecognition.startAsync({
                continuous: false, // Set to true for continuous listening
                interimResults: false, // Set to true to get results as user speaks
            });

        } catch (error) {
            console.error('Error starting speech recognition:', error);
            setIsListening(false);
            setInputMessage('');
            Alert.alert('Speech Error', 'Failed to start speech recognition. Make sure your microphone is working and permissions are granted.');
        }
    };

    const stopListening = async () => {
        try {
            await SpeechRecognition.stopAsync();
            setIsListening(false);
            // After stopping, if the input still says "Listening...", clear it.
            // Actual text will be set by onSpeechResults if successful.
            if (inputMessage === 'Listening...') {
                setInputMessage('');
            }
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
            Alert.alert('Error', 'Failed to stop speech recognition.');
        }
    };

    // --- End Speech-to-Text and Translation Logic ---

    return (
        <LinearGradient colors={isDarkMode ? ['#0f0c29', '#302b63', '#24243e'] : ['#89f7fe', '#fad0c4']} style={styles.container}>
            <SafeAreaView style={styles.container}>
                <View style={styles.LogoParent}>
                    <LottieView
                        source={require('../../assets/AI_Intro_Loader.json')}
                        autoPlay={true}
                        loop={true}
                        speed={1}
                        style={styles.lottie}
                    />
                </View>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 65} // Adjusted offset for better visibility
                    style={styles.keyboardAvoidingView}
                >
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.chatContainer}
                        ref={scrollRef}>
                        {messages.map((item, index) => (
                            <View
                                key={`message-${index}`}
                                style={item.role === 'user' ? styles.HumanMessage : styles.AIMessage}
                            >
                                <View style={item.role === 'user' ? styles.HumanMsgLogoParent : styles.AIMsgLogoParent}>
                                    <Image
                                        key={user?.profileImageUrl || 'default-image'}
                                        source={
                                            item.role === 'user'
                                                ? user?.profileImageUrl
                                                    ? { uri: user?.profileImageUrl }
                                                    : require('../../assets/updatedLogo1.png') // Fallback user image
                                                : AI
                                        }
                                        style={styles.miniLogo}
                                        // No 'priority' prop for Image in React Native
                                    />
                                </View>
                                <View
                                    style={item.role === 'user' ? styles.HumanTextParent : styles.RoboTextParent}
                                >
                                    {item.loading && item.role === 'assistant' ? (
                                        <LottieView
                                            source={require('../../assets/AI_Loader.json')}
                                            autoPlay={true}
                                            loop={true}
                                            speed={1.5}
                                            style={styles.loader}
                                        />
                                    ) : (
                                        <View style={item.role === 'user' ? styles.HumanMessageContainer : styles.RoboMessageContainer} >
                                            {item.role === 'assistant' ? (
                                                <FadeInText style={[styles.AIText, { flexWrap: 'wrap' }]}>
                                                    {item.text}
                                                </FadeInText>
                                            ) : (
                                                <Text style={styles.AIText}>{item.text}</Text>
                                            )}
                                        </View>
                                    )}
                                </View>
                            </View>
                        ))}
                    </ScrollView>

                    <View style={styles.inputContainer}>
                        {
                            (!user?.premiumuser || promptLimit) ? (
                                <TouchableOpacity
                                    style={{
                                        paddingVertical: 10, width: '100%', height: '100%', borderRadius: 20,
                                        backgroundColor: isDarkMode ? 'rgba(209, 184, 17, 0.26)' : '#E9A319',
                                        justifyContent: 'center', // Center content
                                        alignItems: 'center',     // Center content
                                    }}
                                    onPress={() => navigation.navigate('Premium')}
                                >
                                    <View style={styles.buttonStylings}>
                                        <CrownIcon name="crown" size={24} color="#FFD700" />
                                        <Text style={[styles.buttonText, isDarkMode && { color: '#FFF085' }]}>
                                            Buy Premium to use Agent QD
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={[styles.microphoneButton, isListening && styles.microphoneButtonActive]}
                                        onPress={isListening ? stopListening : startListening}
                                        disabled={isWaiting} // Disable microphone if AI is generating a response
                                    >
                                        <Icon
                                            name={isListening ? "microphone-off" : "microphone"}
                                            size={24}
                                            color={isListening ? "#fff" : "#555"}
                                        />
                                    </TouchableOpacity>
                                    <TextInput
                                        style={styles.input}
                                        placeholder={isListening ? "Say something..." : "Ask your queries to our Agent QD..."}
                                        placeholderTextColor="grey"
                                        value={inputMessage}
                                        onChangeText={setInputMessage}
                                        editable={!isWaiting && !isListening} // Disable typing when listening
                                    />
                                    {
                                        !isWaiting ? (
                                            <TouchableOpacity
                                                style={styles.sendButton}
                                                onPress={sendMessage}
                                                disabled={isListening || !inputMessage.trim()} // Disable send if listening or input is empty
                                            >
                                                <Image source={Stars2} style={{ height: 30, width: 30 }} />
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity
                                                style={[styles.sendButton, { backgroundColor: '#e74c3c', paddingVertical: 17, paddingHorizontal: 12.5 }]}
                                                onPress={stopResponse}
                                            >
                                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Stop</Text>
                                            </TouchableOpacity>
                                        )
                                    }
                                </>
                            )
                        }
                    </View>

                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
};


const styles = StyleSheet.create({
    LogoParent: {
        justifyContent: 'space-evenly',
        alignItems: 'center',
        flexDirection: 'row',
        height: 180,
        marginBottom: 10,
    },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    lottie: {
        width: 180,
        height: 180,
        resizeMode: 'contain',
    },
    container: {
        flex: 1,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    buttonStylings: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    mainTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        marginTop: 20,
        color: '#00796b'
    },
    AIMessage: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginVertical: 5,
        marginRight: 10,
    },
    AIMsgLogoParent: {
        marginRight: 10,
    },
    RoboTextParent: {
        maxWidth: '80%',
    },
    RoboMessageContainer: {
        backgroundColor: '#EAF4FC',
        padding: 12,
        borderRadius: 16,
        borderTopLeftRadius: 0,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 1, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    AIText: {
        color: '#2c3e50',
        fontWeight: '500',
        fontSize: 15,
        lineHeight: 20,
        flexShrink: 1,
        flexWrap: 'wrap',
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
        backgroundColor: '#FFF3DB',
        padding: 12,
        borderRadius: 16,
        borderTopRightRadius: 0,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 1, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    loader: {
        height: 40,
        width: 40,
    },
    HumanMsgLogoParent: {
        marginLeft: 10,
    },
    miniLogo: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    inputContainer: {
        position: 'absolute',
        bottom: 65,
        left: 10,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: 'white',
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 5,
    },
    input: {
        flex: 1,
        height: 40,
        paddingHorizontal: 15,
        backgroundColor: '#f2f2f2',
        borderRadius: 20,
        fontSize: 14,
        color: '#333',
        marginLeft: 8,
    },
    sendButton: {
        marginLeft: 8,
        backgroundColor: '#FFB22C',
        borderRadius: 50,
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    chatContainer: {
        flexGrow: 1,
        padding: 16,
        paddingBottom: 130, // Ensure space for the input field
    },
    microphoneButton: {
        backgroundColor: '#f2f2f2',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 5,
    },
    microphoneButtonActive: {
        backgroundColor: '#e74c3c',
    },
});

export default AI_Support;