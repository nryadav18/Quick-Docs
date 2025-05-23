import React, { useState, useRef, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
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


const VoiceToVoiceScreen = () => {
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const { isDarkMode } = useContext(ThemeContext);
    const user = useUserStore((state) => state.user);
    const navigation = useNavigation();
    useThemedStatusBar(isDarkMode)

    const sound = useRef(new Audio.Recording());
    const animationRef = useRef(null);

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
                name: 'audio.amr',
                type: 'audio/amr',
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
                pitch: 1.2,
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

    return (
        <LinearGradient colors={isDarkMode ? ['#0f0c29', '#302b63', '#24243e'] : ['#89f7fe', '#fad0c4']} style={styles.container}>
            <Animatable.Text animation="fadeInDown" style={[styles.title, !isDarkMode && { color: 'black' }]}>
                🤖 AI Voice Assistant
            </Animatable.Text>

            <Animatable.View animation="pulse" iterationCount="infinite">
                <TouchableOpacity
                    onPress={isRecording ? stopRecording : startRecording}
                    style={[styles.micButton, isRecording ? styles.stopButton : styles.startButton]}
                    disabled={loading || isSpeaking}
                >
                    <LottieView
                        source={require('../../assets/MicAnimation.json')} // Lottie file for AI analyzing animation
                        autoPlay
                        loop
                        style={{ height: 150, width: 150 }}
                    />
                </TouchableOpacity>
            </Animatable.View>

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
                <Animatable.View animation="fadeInUp" style={styles.speakingContainer}>
                    <Text style={styles.speakingText}>🔊 Assistant is Speaking</Text>
                    <TouchableOpacity onPress={stopSpeaking} style={styles.voiceIconButton}>
                        <MaterialCommunityIcons name="stop-circle" size={48} color="#ff4c4c" />
                    </TouchableOpacity>
                </Animatable.View>
            )}
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
    loadingText: {
        textAlign: 'center',
        color: '#00ffcc',
        marginTop: 10,
        fontSize: 16,
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
