import React, { useContext, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/ThemeContext';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const Header = ({ title }) => {
    const { isDarkMode, toggleTheme } = useContext(ThemeContext);
    const navigation = useNavigation();

    const rotateValue = useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(rotateValue, {
            toValue: isDarkMode ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isDarkMode]);

    const toggleDarkMode = () => {
        toggleTheme();
    };

    const rotateIcon = rotateValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg']
    });

    const goToPremium = () => {
        navigation.navigate('Premium');
    };

    return (
        <SafeAreaView style={[styles.safeArea, isDarkMode && styles.darkSafeArea]}>
            <View style={[styles.header, isDarkMode && styles.darkHeader]}>
                {/* Title */}
                <Text style={[styles.title, isDarkMode && styles.darkTitle]}>{title}</Text>

                <View style={styles.actions}>
                    {/* Premium Button */}
                    <TouchableOpacity onPress={goToPremium} style={[styles.premiumButton,
                    (!isDarkMode && { backgroundColor: '#E9A319' })]}>
                        <FontAwesome5 name="crown" size={18} color="#FFD700" />
                        <Text style={[styles.premiumText, (!isDarkMode && { color: 'black' })]}>Become King</Text>
                    </TouchableOpacity>

                    {/* Toggle Theme Button */}
                    <TouchableOpacity onPress={toggleDarkMode} style={styles.toggleButton}>
                        <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
                            <Ionicons
                                name={isDarkMode ? "sunny" : "moon"}
                                size={24}
                                color={isDarkMode ? "#FFD700" : "black"}
                            />
                        </Animated.View>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: '#89f7fe',
    },
    darkSafeArea: {
        backgroundColor: '#0f0c29',
    },
    header: {
        padding: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'black',
    },
    darkTitle: {
        color: '#F5F5F5',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bottomLine: {
        height: 3,
        backgroundColor: '#a8adaa',
        width: '100%',
        alignSelf: 'center', // center the line
        marginBottom: 6,
        borderRadius : 10
    },
    premiumButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
        backgroundColor: 'rgba(255, 223, 0, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    premiumText: {
        marginLeft: 5,
        color: '#FFF085',
        fontWeight: '600',
    },
    toggleButton: {
        padding: 10,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 0, 0, 0.2)',
    },
});

export default Header;