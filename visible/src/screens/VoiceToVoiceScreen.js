import React, { useState, useRef, useContext, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated, Dimensions, Platform, PermissionsAndroid, Linking, ScrollView } from 'react-native';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import LottieView from 'lottie-react-native';
import { BACKEND_URL } from '@env';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import useThemedStatusBar from '../hooks/StatusBar';
import useUserStore from '../store/userStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PermissionAlert } from '../components/AlertBox';
import { scaleFont } from "../components/ScaleFont"
const { width, height } = Dimensions.get('window');

const VoiceToVoiceScreen = () => {
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [humanQuestion, setHumanQuestion] = useState('')
    const [aiAnswer, setAiAnswer] = useState('')
    const [showLanguageInfo, setShowLanguageInfo] = useState(false);
    const [translationInfo, setTranslationInfo] = useState(null);
    const { isDarkMode } = useContext(ThemeContext);
    const user = useUserStore((state) => state.user);
    const navigation = useNavigation();
    useThemedStatusBar(isDarkMode)

    // Permission States
    const [permissionVisible, setPermissionVisible] = useState(false);
    const [permissionTitle, setPermissionTitle] = useState('');
    const [permissionMessage, setPermissionMessage] = useState('');

    const [currentSound, setCurrentSound] = useState('')

    // Permission Functions
    const showPermissionAlert = (title, message) => {
        setPermissionTitle(title)
        setPermissionMessage(message)
        setPermissionVisible(true)
    }

    // Animation States
    const micScale = useRef(new Animated.Value(1)).current;
    const micGlow = useRef(new Animated.Value(0)).current;
    const micRotation = useRef(new Animated.Value(0)).current;
    const waveAnimation = useRef(new Animated.Value(0)).current;
    const particleAnim1 = useRef(new Animated.Value(0)).current;
    const particleAnim2 = useRef(new Animated.Value(0)).current;
    const particleAnim3 = useRef(new Animated.Value(0)).current;
    const backgroundPulse = useRef(new Animated.Value(0)).current;
    const textGlow = useRef(new Animated.Value(0)).current;
    const orbitAnim = useRef(new Animated.Value(0)).current;
    const breathingAnim = useRef(new Animated.Value(1)).current;


    const sound = useRef(new Audio.Recording());
    const animationRef = useRef(null);

    useEffect(() => {
        startAmbientAnimations();
        return () => {
            stopAllAnimations();
            // cleanupRecording();
        };
    }, []);

    const requestMicrophonePermission = async () => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                {
                    title: 'Microphone Permission',
                    message: 'This app needs access to your microphone.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
            );

            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                showPermissionAlert('Microphone Access Needed', 'Enable microphone access in settings to use voice features.');
                return false;
            }

            return true;
        } else if (Platform.OS === 'ios') {
            const { status } = await Audio.requestPermissionsAsync();

            if (status !== 'granted') {
                showPermissionAlert('Microphone Access Needed', 'Enable microphone access in settings to use voice features.');
                return false;
            }

            return true;
        }
    };

    const startRecording = async () => {
        if (!user?.premiumuser) {
            navigation.navigate('Premium');
            return;
        }

        const planNames = user?.premiumDetails.map(p => { return p.type || '' });

        if (!planNames.some(name => name.includes('Ultra Pro Max'))) {
            navigation.navigate('Premium');
            return;
        }

        await requestMicrophonePermission();

        Animated.timing(micGlow, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false, // Changed to false
        }).start();

        try {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.AMR_NB
            );

            sound.current = recording;
            setRecording(recording);
            setIsRecording(true);
        } catch (error) {
            console.error('Recording failed', error);
        }
    };

    const stopRecording = async () => {
        setLoading(true)
        setHumanQuestion('')
        setIsRecording(false);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);
        await handleVoiceToVoice(uri);

        Animated.parallel([
            Animated.timing(micScale, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(micGlow, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false, // Changed to false
            }),
            Animated.timing(textGlow, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false, // Changed to false
            })
        ]).start();
    };

    const cleanTextForSpeech = (text) => {
        return text
            .replace(/[*_`~#>|{}\[\]()]/g, '')       // Remove markdown and special characters
            .replace(/\s+/g, ' ')                    // Normalize whitespace
            .replace(/https?:\/\/\S+/g, '[link]')    // Replace URLs with a placeholder
            .trim();
    };


    const playBase64Audio = async (base64Audio) => {
        try {
            // Unload any existing sound before starting a new one
            if (currentSound) {
                await currentSound.stopAsync();
                await currentSound.unloadAsync();
                setCurrentSound(null)
            }

            const soundObject = new Audio.Sound();
            setCurrentSound(soundObject)

            await soundObject.loadAsync({ uri: base64Audio }, {}, true);
            setLoading(false);
            setIsSpeaking(true);

            await soundObject.playAsync();

            soundObject.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) {
                    setIsSpeaking(false);
                    soundObject.unloadAsync();
                    setCurrentSound(null)
                }
            });

        } catch (error) {
            console.error("Error playing Base64 audio:", error);
            setLoading(false);
            setIsSpeaking(false);
            alert('Failed to play audio');
        }
    };

    const getTeluguAudioFromGoogleTTS = async (text) => {
        const response = await axios.post(`${BACKEND_URL}/text-to-speech`, {
            text,
            languageCode: 'te-IN',
            name: "te-IN-Chirp3-HD-Achernar",
            ssmlGender: 'MALE',
            audioEncoding: 'MP3',
            speakingRate: 1.0
        });
        return `data:audio/mp3;base64,${response.data.audioContent}`;
    };

    const handleVoiceToVoice = async (audioUri) => {
        const { updateDashboardEntry } = useUserStore.getState();
        setIsSpeaking(false);
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('audio', {
                uri: audioUri,
                name: "audio.3gp",
                type: "audio/3gpp",
            });

            const transcribeRes = await axios.post(`${BACKEND_URL}/speech-to-text-app`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const { translationInfo: transInfo, originalText } = transcribeRes.data;
            setTranslationInfo(transInfo)
            setShowLanguageInfo(true)
            setHumanQuestion(originalText)

            const question = transcribeRes.data.translation || transcribeRes.data.transcript;
            let answer = '', detectedLanguage = 'en-IN';

            console.log('Handling Voice Here')

            if (!question) {
                answer = 'Please Speak Something to Answer'; // Default Telugu message
            } else {
                detectedLanguage = transcribeRes.data.detectedLanguage || 'en-IN';
                const aiResponse = await axios.post(`${BACKEND_URL}/ask`, {
                    question,
                    username: user?.username ?? 'Test',
                    detectedLanguage
                });
                answer = cleanTextForSpeech(aiResponse.data.answer);
            }
            setAiAnswer(answer)
            updateDashboardEntry('voice', 1);

            try {
                const payload = {
                    username: user?.username ?? 'Test',
                    voice: 1  // increment by 1
                };

                await fetch(`${BACKEND_URL}/update-dashboard`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });

            } catch (error) {
                console.error('Failed to increment analytics:', error);
            }


            const speakInLanguage = async () => {
                const langCode = detectedLanguage;
                setShowLanguageInfo(false)

                if (langCode.startsWith('te')) {
                    // Use Google Cloud TTS for Telugu
                    try {
                        const audioURI = await getTeluguAudioFromGoogleTTS(answer);
                        await playBase64Audio(audioURI);
                    } catch (error) {
                        setLoading(false);
                        setIsSpeaking(false);
                        console.error('TTS Error:', error.message);
                        if (error.response) {
                            // Server responded with a status other than 2xx
                            console.error('Response Data:', error.response.data);
                            console.error('Status Code:', error.response.status);
                        } else if (error.request) {
                            // No response received
                            console.error('No response received:', error.request);
                        } else {
                            // Something else went wrong
                            console.error('Unexpected error:', error);
                        }
                    }
                } else {
                    setLoading(false);
                    setIsSpeaking(true);
                    Speech.speak(answer, {
                        language: 'en-IN',
                        rate: 1.0,
                        onDone: () => setIsSpeaking(false),
                    });
                }
            };

            await speakInLanguage();

        } catch (err) {
            setLoading(false);
            setIsSpeaking(false);
            console.error(err);
            alert('Something went wrong!');
        }

        setLoading(false);
    };

    const stopSpeaking = async () => {
        if (currentSound) {
            await currentSound.stopAsync();
            await currentSound.unloadAsync();
            setCurrentSound(null)
            setShowLanguageInfo(false)
        }

        Speech.stop(); // For English voice
        setIsSpeaking(false);
    };


    const startAmbientAnimations = () => {
        // Breathing animation for the entire interface
        Animated.loop(
            Animated.sequence([
                Animated.timing(breathingAnim, {
                    toValue: 1.02,
                    duration: 4000,
                    useNativeDriver: true,
                }),
                Animated.timing(breathingAnim, {
                    toValue: 1,
                    duration: 4000,
                    useNativeDriver: true,
                })
            ])
        ).start();

        // Orbiting particles
        Animated.loop(
            Animated.timing(orbitAnim, {
                toValue: 1,
                duration: 20000,
                useNativeDriver: true,
            })
        ).start();

        // Background pulse - using useNativeDriver: false for opacity
        Animated.loop(
            Animated.sequence([
                Animated.timing(backgroundPulse, {
                    toValue: 1,
                    duration: 3000,
                    useNativeDriver: false,
                }),
                Animated.timing(backgroundPulse, {
                    toValue: 0,
                    duration: 3000,
                    useNativeDriver: false,
                })
            ])
        ).start();

        // Floating particles
        startParticleAnimations();
    };

    const startParticleAnimations = () => {
        const animateParticle = (anim, delay = 0) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 8000 + Math.random() * 4000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    })
                ])
            ).start();
        };

        animateParticle(particleAnim1, 0);
        animateParticle(particleAnim2, 2000);
        animateParticle(particleAnim3, 4000);
    };

    const stopAllAnimations = () => {
        micScale.stopAnimation();
        micGlow.stopAnimation();
        micRotation.stopAnimation();
        waveAnimation.stopAnimation();
        textGlow.stopAnimation();
        orbitAnim.stopAnimation();
        backgroundPulse.stopAnimation();
        breathingAnim.stopAnimation();
    };

    const renderOrbitingElements = () => {
        return (
            <Animated.View
                style={[
                    styles.orbitContainer,
                    {
                        transform: [
                            {
                                rotate: orbitAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0deg', '360deg']
                                })
                            }
                        ]
                    }
                ]}
            >
                {[0, 1, 2, 3, 4, 5].map((index) => (
                    <View
                        key={index}
                        style={[
                            styles.orbitDot,
                            {
                                transform: [
                                    { rotate: `${index * 60}deg` },
                                    { translateY: -100 }
                                ]
                            }
                            , !isDarkMode && { backgroundColor: '#302b63', shadowColor: '#302b63' }]}
                    />
                ))}
            </Animated.View>
        );
    };

    const renderFloatingParticles = () => {
        const particles = [particleAnim1, particleAnim2, particleAnim3];

        return particles.map((anim, index) => (
            <Animated.View
                key={index}
                style={[
                    styles.particle,
                    {
                        left: (index * width * 0.3) + (width * 0.2),
                        transform: [
                            {
                                translateY: anim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [height, -100]
                                })
                            },
                            {
                                translateX: anim.interpolate({
                                    inputRange: [0, 0.5, 1],
                                    outputRange: [0, (index % 2 === 0 ? 50 : -50), 0]
                                })
                            }
                        ],
                        opacity: anim.interpolate({
                            inputRange: [0, 0.1, 0.9, 1],
                            outputRange: [0, 1, 1, 0]
                        })
                    }
                    , !isDarkMode && { color: '#302b63', shadowColor: '#302b63' }]}
            >
                <LinearGradient
                    colors={isDarkMode ? ['#00ffcc', '#0099ff'] : ['black', 'black']}
                    style={styles.particleGradient}
                />
            </Animated.View>
        ));
    };

    const getLanguageName = (languageCode) => {
        const languageNames = {
            'en-IN': 'English',
            'en-US': 'English',
            'te-IN': 'Telugu'
        };

        return languageNames[languageCode] || languageCode;
    };

    const renderLanguageInfo = () => {
        if (!showLanguageInfo || !translationInfo) return null;

        return (
            <Animated.View
                style={[
                    languageStylings.languageInfoBanner,
                    { backgroundColor: isDarkMode ? 'rgba(0, 121, 107, 0.95)' : 'rgba(0, 121, 107, 0.12)' },
                    languageStylings.elevationShadow
                ]}
            >
                <View style={languageStylings.languageInfoContent}>
                    {/* Globe Icon */}
                    <View style={languageStylings.iconContainer}>
                        <Text style={[languageStylings.languageInfoIcon, { color: isDarkMode ? '#A5D6A7' : '#00796b', }]}>🌐</Text>
                    </View>

                    {/* Language Info Text */}
                    <View style={languageStylings.languageInfoText}>
                        <Text style={[languageStylings.languageInfoTitle, { color: isDarkMode ? '#fff' : '#004D40' }]}>
                            Language Detected: {getLanguageName(translationInfo.originalLanguage)}
                        </Text>
                        {translationInfo.wasTranslated && (
                            <Text style={[languageStylings.languageInfoSubtitle, { color: isDarkMode ? '#E0E0E0' : '#555' }]}>
                                Automatically translated to English
                            </Text>
                        )}
                    </View>

                    {/* Close Button */}
                    <TouchableOpacity
                        onPress={() => setShowLanguageInfo(false)}
                        style={[languageStylings.dismissButton, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' }]}
                        accessibilityLabel="Dismiss language info"
                    >
                        <Text style={[languageStylings.closeButtonText, { color: isDarkMode ? '#FFFFFFCC' : '#555', }]}>✕</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        );
    };

    return (
        <LinearGradient colors={isDarkMode ? ['#0f0c29', '#302b63', '#24243e'] : ['#89f7fe', '#fad0c4']} style={styles.container}>
            {renderLanguageInfo()}

            {renderFloatingParticles()}
            <Animatable.Text animation="fadeInDown" style={[styles.title, !isDarkMode && { color: 'black' }]}>
                🤖 Tap on Robo to Activate Assistant
            </Animatable.Text>
            {renderOrbitingElements()}


            <Animated.View
                style={[
                    styles.micContainer,
                    {
                        transform: [
                            { scale: micScale },
                            {
                                rotate: micRotation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0deg', '360deg']
                                })
                            }
                        ]
                    }
                ]}
            >

                {/* Sound waves */}
                {(isRecording || isSpeaking) && (
                    <>
                        {[1, 2, 3].map((wave) => (
                            <Animated.View
                                key={wave}
                                style={[
                                    styles.soundWave,
                                    {
                                        opacity: waveAnimation.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.8, 0]
                                        }),
                                        transform: [
                                            {
                                                scale: waveAnimation.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [1, 1.5 + (wave * 0.3)]
                                                })
                                            }
                                        ]
                                    }
                                ]}
                            />
                        ))}
                    </>
                )}

                <TouchableOpacity
                    onPress={isRecording ? stopRecording : startRecording}
                    style={[styles.micButton, isRecording ? [styles.stopButton, !isDarkMode && { borderColor: 'black' }] : [styles.startButton, !isDarkMode && { borderColor: '#302b63' }], !isDarkMode && { backgroundColor: '#302b63', shadowColor: '#302b63' }]}
                    disabled={loading || isSpeaking}
                >
                    {
                        loading || isRecording ?
                            (
                                <LottieView
                                    source={require('../../assets/VoiceLoader2.json')} // Lottie file for AI analyzing animation
                                    autoPlay
                                    loop
                                    style={{ height: 110, width: 110 }}
                                />
                            ) : (
                                <LottieView
                                    source={require('../../assets/VoiceLoader2.json')} // Lottie file for AI analyzing animation
                                    autoPlay={false}
                                    loop={false}
                                    style={{ height: 110, width: 110 }}
                                />
                            )
                    }
                </TouchableOpacity>
            </Animated.View>

            {
                humanQuestion && (
                    <Animatable.View animation="fadeIn" delay={500} style={styles.humanQuestionView}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={[styles.humanQuestionText, { color: isDarkMode ? 'yellow' : 'black' }]}>{humanQuestion}</Text>
                        </ScrollView>
                    </Animatable.View>
                )
            }

            {loading && (
                <View style={{ marginTop: 30, width: '100%', height: 200, justifyContent: 'center', alignItems: 'center' }}>
                    <LottieView
                        source={require('../../assets/VoiceLoader.json')} // Lottie file for AI analyzing animation
                        autoPlay
                        loop
                        speed={.3}
                        style={{ height: 240, width: '110%' }}
                    />
                </View>
            )}

            {
                !loading && aiAnswer && (
                    <Animatable.View animation="fadeIn" delay={500} style={styles.aiAnswerView}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={[styles.aiAnswerText, { color: isDarkMode ? '#00ffcc' : 'black' }]}>{aiAnswer}</Text>
                        </ScrollView>
                    </Animatable.View>
                )
            }

            {isSpeaking && (
                <View style={styles.speakingContainer}>
                    <Animatable.View animation="bounceIn" delay={300}>
                        <TouchableOpacity
                            onPress={stopSpeaking}
                            style={styles.stopSpeakingButton}
                        >
                            <LinearGradient
                                colors={['#ff4c4c', '#ff6b6b']}
                                style={styles.stopButtonGradient}
                            >
                                <MaterialCommunityIcons name="stop-circle" size={50} color="white" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animatable.View>
                </View>
            )}


            {/* Status indicator */}
            <Animatable.View animation="fadeInUp" delay={1000} style={styles.statusContainer}>
                <View style={[styles.statusDot, { backgroundColor: isRecording ? '#ff4c4c' : loading ? 'yellow' : isSpeaking ? '#00ffcc' : '#666' }]} />
                <Text style={styles.statusText}>
                    {isRecording ? 'Listening...' : isSpeaking ? 'Speaking...' : loading ? 'Processing...' : 'Ready'}
                </Text>
            </Animatable.View>
            <PermissionAlert visible={permissionVisible} title={permissionTitle} message={permissionMessage} onAllow={() => { Linking.openSettings(); }} onCancel={() => setPermissionVisible(false)} />
        </LinearGradient>
    );
};

export default VoiceToVoiceScreen;

const languageStylings = StyleSheet.create({
    languageInfoBanner: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        zIndex: 1000,
    },

    elevationShadow: {
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },

    languageInfoContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },

    iconContainer: {
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },

    languageInfoIcon: {
        fontSize: scaleFont(22),
    },

    languageInfoText: {
        flex: 1,
    },

    languageInfoTitle: {
        fontSize: scaleFont(14),
        fontWeight: '600',
        marginBottom: 4,
    },

    languageInfoSubtitle: {
        fontSize: scaleFont(11),
        fontWeight: '400',
    },

    dismissButton: {
        marginLeft: 12,
        justifyContent: 'center',
        alignItems: 'center',
        width: 30,
        height: 30,
        borderRadius: 15,
    },

    closeButtonText: {
        fontSize: scaleFont(18),
        fontWeight: 'bold',
    }
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA', justifyContent: 'start', alignItems: 'center', padding: 20, gap: 30 },
    title: {
        fontSize: scaleFont(20),
        color: '#f0f6fc',
        fontWeight: 'bold',
        marginBottom: 20,
    },
    micButton: {
        borderRadius: 100,
        backgroundColor: '#22272e',
        elevation: 10,
        shadowColor: '#00ffcc',
        shadowOpacity: 0.6,
        shadowRadius: 10,
        padding: 20
    },
    humanQuestionView: {
        width: (.85 * width),
        borderWidth: 1,
        maxHeight: 80,
        borderColor: 'skyblue',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        padding: 10,
        backgroundColor: 'rgba(255,255,255,.1)',
    },
    humanQuestionText: {
        fontSize: 18,
        fontWeight: 800,
    },
    aiAnswerView: {
        width: (.85 * width),
        maxHeight: 140,
        borderWidth: 1,
        borderColor: 'skyblue',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        padding: 10,
        backgroundColor: 'rgba(255,255,255,.1)',
    },
    aiAnswerText: {
        fontSize: 18,
        fontWeight: 800,
    },
    micImage: {
        width: 100,
        height: 100,
    },
    startButton: {
        borderColor: '#00ffcc',
        borderWidth: 2,
    },
    stopButton: {
        borderColor: '#ff4d4d',
        borderWidth: 2,
    },
    particle: {
        position: 'absolute',
        width: 4,
        height: 4,
        color: 'green'
    },
    micContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop : 30,
        marginBottom : 40,
    },
    micImage: {
        height: 100,
        width: 100,
        tintColor: '#ffffff',
    },
    soundWave: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 2,
        borderColor: '#00ffcc',
        backgroundColor: 'transparent',
    },
    particleGradient: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    loadingText: {
        textAlign: 'center',
        color: '#00ffcc',
        marginTop: 10,
        fontSize: scaleFont(14),
    },
    orbitContainer: {
        position: 'absolute',
        top: 50,
        width: 300,
        height: 300,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stopSpeakingButton: {
        borderRadius: 50,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#ff4c4c',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    stopButtonGradient: {
        width: 70,
        height: 70,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    orbitDot: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#00ffcc',
        shadowColor: '#00ffcc',
        shadowRadius: 10,
        shadowOpacity: 0.8,
        elevation: 10,
    },
    particle: {
        position: 'absolute',
        width: 4,
        height: 4,
        color: 'green'
    },
    particleGradient: {
        width: 4,
        color: 'green',
        height: 4,
        borderRadius: 2,
    },
    statusContainer: {
        position: 'absolute',
        bottom: 80,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    statusText: {
        color: '#ffffff',
        fontSize: scaleFont(14),
        fontWeight: '500',
    },
    speakingContainer: {
        gap: 40,
        alignItems: 'center',
        marginBottom: 10
    },
    speakingText: {
        color: '#e6f1ff',
        fontSize: scaleFont(24),
        fontWeight: 600,
        marginBottom: 10,
    },
    stopSpeaking: {
        backgroundColor: '#6c757d',
    },
    voiceSelector: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 30,
    },
    voiceButton: {
        padding: 10,
        backgroundColor: '#22272e',
        borderRadius: 10,
    },
    voiceText: {
        color: '#fff',
        fontSize: scaleFont(12),
    },
    voiceSelected: {
        backgroundColor: '#00ffcc',
    },
});
