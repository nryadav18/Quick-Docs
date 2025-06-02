import React, { useState, useRef, useContext, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated, Dimensions } from 'react-native';
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

const { width, height } = Dimensions.get('window');

const VoiceToVoiceScreen = () => {
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const { isDarkMode } = useContext(ThemeContext);
    const user = useUserStore((state) => state.user);
    const navigation = useNavigation();
    useThemedStatusBar(isDarkMode)

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

    const handleVoiceToVoice = async (audioUri) => {
        setLoading(true);
        setIsSpeaking(false);

        try {
            const formData = new FormData();
            formData.append('audio', {
                uri: audioUri,
                name: "audio.3gp",
                type: "audio/3gpp",
            });

            const transcribeRes = await axios.post(`${BACKEND_URL}/transcribe-audio`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const question = transcribeRes.data.translation || transcribeRes.data.transcript;

            let aiResponse, answer;

            if (!question) {
                answer = 'Please Speak Something to Answer';
            }

            else {
                aiResponse = await axios.post(`${BACKEND_URL}/ask`, {
                    question,
                    username: user?.username ?? 'Test',
                    userfullname: user?.name ?? 'Testing',
                    email: user?.email ?? 'test@gmail.com',
                    dob: user?.dob ?? '01-01-2001',
                    gender: user?.gender ?? 'Others',
                    ispremiumuser: user?.premiumuser ?? false,
                    numberoffilesuploaded: user?.myfiles?.length ?? 0,
                });
                answer = cleanTextForSpeech(aiResponse.data.answer);
            }

            setIsSpeaking(true);

            Speech.speak(answer, {
                language: 'en',
                pitch: 1.0,
                rate: 1.0,
                onDone: () => setIsSpeaking(false),
            });

        } catch (err) {
            console.error(err);
            alert('Something went wrong!');
        }

        setLoading(false);
    };

    const stopSpeaking = () => {
        Speech.stop();
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
                    colors={ isDarkMode ? ['#00ffcc', '#0099ff'] : [ 'black' , 'black' ]}
                    style={styles.particleGradient}
                />
            </Animated.View>
        ));
    };

    return (
        <LinearGradient colors={isDarkMode ? ['#0f0c29', '#302b63', '#24243e'] : ['#89f7fe', '#fad0c4']} style={styles.container}>

            {renderFloatingParticles()}
            <Animatable.Text animation="fadeInDown" style={[styles.title, !isDarkMode && { color: 'black' }]}>
                🤖 AI Voice Assistant
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
                    style={[styles.micButton, isRecording ? [styles.stopButton, !isDarkMode && {borderColor : 'black'}] : [styles.startButton, !isDarkMode && {borderColor : '#302b63'}], !isDarkMode && { backgroundColor: '#302b63', shadowColor: '#302b63'}]}
                    disabled={loading || isSpeaking}
                >
                    <LottieView
                        source={require('../../assets/MicAnimation.json')} // Lottie file for AI analyzing animation
                        autoPlay
                        loop
                        style={{ height: 150, width: 150 }}
                    />
                </TouchableOpacity>
            </Animated.View>

            {loading && (
                <View style={{ marginTop: 30, width: 200, height: 200, justifyContent: 'center', alignItems: 'center' }}>
                    <LottieView
                        source={require('../../assets/loading-full.json')} // Lottie file for AI analyzing animation
                        autoPlay
                        loop
                        style={{ height: 300, width: 300 }}
                    />
                </View>
            )}

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
                                <MaterialCommunityIcons name="stop-circle" size={60} color="white" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animatable.View>
                </View>
            )}
            {/* Status indicator */}
            <Animatable.View animation="fadeInUp" delay={1000} style={styles.statusContainer}>
                <View style={[styles.statusDot, { backgroundColor: isRecording ? '#ff4c4c' : isSpeaking ? '#00ffcc' : '#666' }]} />
                <Text style={styles.statusText}>
                    {isRecording ? 'Listening...' : isSpeaking ? 'Speaking...' : loading ? 'Processing...' : 'Ready'}
                </Text>
            </Animatable.View>
        </LinearGradient>
    );
};

export default VoiceToVoiceScreen;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA', justifyContent: 'start', alignItems: 'center', padding: 20, gap: 30 },
    title: {
        fontSize: 26,
        color: '#f0f6fc',
        fontWeight: 'bold',
        marginBottom: 20,
        marginTop: 50,
    },
    micButton: {
        borderRadius: 100,
        backgroundColor: '#22272e',
        elevation: 10,
        shadowColor: '#00ffcc',
        shadowOpacity: 0.6,
        shadowRadius: 10,
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
        marginVertical: 40,
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
        fontSize: 16,
    },
    orbitContainer: {
        position: 'absolute',
        top: 117,
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
        width: 80,
        height: 80,
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
        bottom: 100,
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
        fontSize: 16,
        fontWeight: '500',
    },
    speakingContainer: {
        marginTop: 20,
        gap: 15,
        alignItems: 'center',
    },
    speakingText: {
        color: '#e6f1ff',
        fontSize: 26,
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
        fontSize: 14,
    },
    voiceSelected: {
        backgroundColor: '#00ffcc',
    },
});
