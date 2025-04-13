import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const AIScreen = () => {

    const { isDarkMode } = useContext(ThemeContext);

    return (
        <LinearGradient colors={isDarkMode ? ['#0f0c29', '#302b63', '#24243e'] : ['#89f7fe', '#fad0c4']} style={[styles.container, isDarkMode && styles.darkContainer]}>
            <Text style={[styles.title, isDarkMode && { color: 'white' }]}>AI Assistant</Text>
            <Text style={[styles.description, isDarkMode && { color: 'white' }]}>Ask anything about your uploaded documents!</Text>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center'},
    title: { fontSize: 24, fontWeight: 'bold' },
    description: { fontSize: 16, color: 'gray', marginTop: 10 }
});

export default AIScreen;
