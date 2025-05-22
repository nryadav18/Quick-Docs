import React, { useState, useContext, useRef, useEffect } from 'react';
import { Text, View, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import AI from '../../assets/robo1.jpg';
import { ThemeContext } from '../context/ThemeContext';
import Human from '../../assets/squad.jpg';
import { SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';
import Stars1 from '../../assets/stars1.png';
import Stars2 from '../../assets/stars2.png';
import { LinearGradient } from 'expo-linear-gradient';
import useUserStore from '../store/userStore';
import { useNavigation } from "@react-navigation/native"
import FadeInText from '../components/FadeInText';
import useThemedStatusBar from '../hooks/StatusBar';
import CrownIcon from 'react-native-vector-icons/FontAwesome5';
import { BACKEND_URL } from '@env';


const AI_Support = () => {
    const [messages, setMessages] = useState([{ role: 'assistant', text: 'Hello! I am Agent QD, How can I assist you today?', loading: false }]);
    const [inputMessage, setInputMessage] = useState('');
    const [isWaiting, setIsWaiting] = useState(false);
    const [isStopped, setIsStopped] = useState(false);
    const [promptLimit, setPromptLimit] = useState(false)
    const { isDarkMode } = useContext(ThemeContext);
    const user = useUserStore((state) => state.user);
    const navigation = useNavigation()
    const scrollRef = useRef(null);
    const abortControllerRef = useRef(null);
    useThemedStatusBar(isDarkMode)


    useEffect(() => {
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
            .replace(/\*\*\*/g, '')  // Remove triple asterisks
            .replace(/\*\*/g, '')    // Remove bold asterisks
            .replace(/\*/g, '')      // Remove italic asterisks
            .replace(/[_~`]/g, '')   // Remove other markdown-like characters
            .trim();
    };


    const blockedKeywords = [
        "generate code",
        "write code",
        "give me code",
        "create an app",
        "build an app",
        "weather in",
        "what is the weather",
        "current weather",
        "app prompt",
        "how to code",
        "GPT plugin",
        "generate a project",
        "open source",
        "location in",
        "my location",
    ];

    function isBlockedPrompt(prompt) {
        if (typeof prompt !== 'string') return false;

        const lowerPrompt = prompt.toLowerCase();

        return Array.isArray(blockedKeywords)
            ? blockedKeywords.some((keyword) => typeof keyword === 'string' && lowerPrompt.includes(keyword))
            : false;
    }



    const sendMessage = async () => {
        const { user, incrementPromptCount, setUser } = useUserStore.getState();

        if (!user) return;

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

            abortControllerRef.current = new AbortController();
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
            // Step 2: Call API to validate and increment prompt count
            const promptRes = await fetch(`${BACKEND_URL}/check-prompt-limitation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user?.username }),
            });

            const promptData = await promptRes.json();
            if (!promptRes.ok) {
                if (promptData?.message === 'Prompt limit reached') {
                    setPromptLimit(true)
                    setTimeout(() => {
                        setMessages((prev) =>
                            prev.map((msg, index) =>
                                index === prev.length - 1
                                    ? { role: 'assistant', text: 'Ohh God! I am Sorry Buddy, Your Limit has Reached, Explore our Budget Friendly Premiums and Purchase them to Enjoy our Valuable Services', loading: false }
                                    : msg
                            )
                        );
                    }, 2000);
                    return;
                } else {
                    throw new Error(promptData.message || 'Prompt check failed');
                }
            }

            // Step 3: Update Zustand count
            incrementPromptCount();

            // Step 4: Call AI service
            const response = await generateBotResponse([...messages, userMessage], abortControllerRef.current.signal);
            if (isStopped) return;
            const rawResponse = response?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not understand that.';
            const botResponse = cleanBotResponse(rawResponse);

            setMessages((prev) =>
                prev.map((msg, index) =>
                    index === prev.length - 1
                        ? { role: 'assistant', text: botResponse, loading: false }
                        : msg
                )
            );

        } catch (error) {
            if (error.name === 'AbortError') {
                setMessages((prev) => prev.filter((msg) => !(msg.loading && msg.role === 'assistant')));
            } else {
                setMessages((prev) =>
                    prev.map((msg, index) =>
                        index === prev.length - 1
                            ? { role: 'assistant', text: 'Oops, something went wrong. Please try again later.', loading: false }
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
                    numberoffilesuploaded: user?.myfiles.length
                })
            });

            const data = await response.json();
            return {
                candidates: [{
                    content: {
                        parts: [{ text: data.answer }]
                    }
                }]
            };
        } catch (error) {
            console.error('Error fetching vector response:', error);
            throw error;
        }
    };


    // Function to stop the ongoing message generation
    const stopResponse = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort(); // abort the fetch
        }
        setIsStopped(true);
        setIsWaiting(false);
    };

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
                    keyboardVerticalOffset={65}
                    style={styles.keyboardAvoidingView}
                >

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.chatContainer}
                        ref={scrollRef} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
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
                                                    : require('../../assets/updatedLogo1.png')
                                                : AI
                                        }
                                        style={styles.miniLogo}
                                        priority="high"
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
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ask your queries to our Agent QD..."
                                        placeholderTextColor="grey"
                                        value={inputMessage}
                                        onChangeText={setInputMessage}
                                        editable={!isWaiting}
                                    />
                                    {
                                        !isWaiting ? (
                                            <TouchableOpacity
                                                style={styles.sendButton}
                                                onPress={sendMessage}
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
        paddingBottom: 130,
    },

});


export default AI_Support;