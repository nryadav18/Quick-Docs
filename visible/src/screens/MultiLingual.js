import React, { useEffect, useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Voice from '@react-native-voice/voice';
import * as Speech from 'expo-speech';

const LANGUAGES = [
    { label: 'English', code: 'en-US' },
    { label: 'Hindi', code: 'hi-IN' },
    { label: 'Telugu', code: 'te-IN' },
    { label: 'Kannada', code: 'kn-IN' },
];

const MultilingualVoiceInput = () => {
    const [inputMessage, setInputMessage] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [language, setLanguage] = useState('te-IN'); // Default: Telugu
    const [isTranslating, setIsTranslating] = useState(false);

    useEffect(() => {
        Voice.onSpeechPartialResults = handlePartialResults;
        Voice.onSpeechEnd = () => setIsListening(false);

        return () => {
            Voice.destroy().then(Voice.removeAllListeners);
        };
    }, []);

    const handlePartialResults = async (event) => {
        const spokenText = event.value?.[0];
        if (!spokenText) return;

        setIsTranslating(true);
        const translated = await translateToEnglish(spokenText);
        setInputMessage(translated);
        setIsTranslating(false);
    };

    const toggleListening = async () => {
        if (isListening) {
            await Voice.stop();
            setIsListening(false);
        } else {
            try {
                setInputMessage('');
                await Voice.start(language);
                setIsListening(true);
            } catch (e) {
                console.error('Voice Start Error:', e);
            }
        }
    };

    const translateToEnglish = async (text) => {
        try {
            const res = await fetch('https://libretranslate.de/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    q: text,
                    source: 'auto',
                    target: 'en',
                    format: 'text',
                }),
            });

            const data = await res.json();
            return data.translatedText || text;
        } catch (error) {
            console.error('Translation error:', error);
            return text;
        }
    };

    const speakText = () => {
        Speech.speak(inputMessage);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.heading}>🎤 Multilingual Voice Input</Text>

            <View style={styles.languageBar}>
                {LANGUAGES.map((lang) => (
                    <TouchableOpacity
                        key={lang.code}
                        style={[styles.langBtn, language === lang.code && styles.selected]}
                        onPress={() => setLanguage(lang.code)}
                    >
                        <Text>{lang.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TextInput
                style={styles.input}
                placeholder="Speak to translate..."
                value={inputMessage}
                onChangeText={setInputMessage}
                editable={!isListening}
            />

            <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.micButton} onPress={toggleListening}>
                    <Text>{isListening ? '🛑 Stop' : '🎙️ Speak'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.speakButton} onPress={speakText} disabled={!inputMessage}>
                    <Text>🔊 Speak Output</Text>
                </TouchableOpacity>
            </View>

            {isTranslating && <ActivityIndicator style={{ marginTop: 10 }} />}
        </View>
    );
};

export default MultilingualVoiceInput;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 100,
        paddingHorizontal: 20,
        backgroundColor: '#f0f4f7',
    },
    heading: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    languageBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        flexWrap: 'wrap',
    },
    langBtn: {
        backgroundColor: '#ddd',
        padding: 8,
        borderRadius: 8,
        marginBottom: 5,
    },
    selected: {
        backgroundColor: '#90ee90',
    },
    input: {
        height: 100,
        borderColor: '#888',
        borderWidth: 1,
        padding: 10,
        borderRadius: 10,
        backgroundColor: '#fff',
        textAlignVertical: 'top',
        fontSize: 16,
    },
    buttonRow: {
        flexDirection: 'row',
        marginTop: 20,
        justifyContent: 'space-between',
    },
    micButton: {
        padding: 12,
        backgroundColor: '#d1e7ff',
        borderRadius: 10,
    },
    speakButton: {
        padding: 12,
        backgroundColor: '#fcd5ce',
        borderRadius: 10,
    },
});
