import React, { useContext, useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/ThemeContext';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import useUserStore from '../store/userStore';
import LottieView from 'lottie-react-native';

const Header = ({ title }) => {
    const { isDarkMode, toggleTheme } = useContext(ThemeContext);
    const navigation = useNavigation();
    const user = useUserStore((state) => state.user);
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
        navigation.navigate('Premium')
    };

    return (
        <SafeAreaView style={[styles.safeArea, isDarkMode && styles.darkSafeArea]}>
            <View style={[styles.header, isDarkMode && styles.darkHeader]}>
                {/* Title */}
                <Text style={[styles.title, isDarkMode && styles.darkTitle]}>{title}</Text>

                {
                    user?.premiumuser && user?.premiumDetails.map(p => p?.type).some(name => name.includes('Ultra Pro Max')) && (
                        <TouchableOpacity style={{
                            height: 46, width: 46, backgroundColor: 'rgba(255, 0, 0, 0.2)',
                            borderRadius: 24, justifyContent: 'center', alignItems: 'center'
                        }} onPress={() => navigation.navigate('Dashboard')}>
                            <LottieView
                                source={isDarkMode ? require('../../assets/DashboardLottie2.json') : require('../../assets/DashboardLottie.json')}
                                autoPlay
                                loop
                                speed={.8}
                                style={{ height: 60, width: 60, resizeMode: 'contain', }}
                            />
                        </TouchableOpacity>
                    )
                }

                <View style={styles.actions}>
                    {/* Premium Button */}
                    {user?.premiumDetails.length < 3 &&
                        !user?.premiumDetails.map(p => p?.type).some(name => name.includes('Ultra Pro Max')) && (
                            <TouchableOpacity onPress={goToPremium} style={[styles.premiumButton,
                            (!isDarkMode && { backgroundColor: '#E9A319' })]}>
                                <FontAwesome5 name="crown" size={18} color="#FFD700" />
                                <Text style={[styles.premiumText, (!isDarkMode && { color: 'black' })]}>
                                    Become {
                                        !user?.premiumuser
                                            ? 'Pro'
                                            : 'Super Pro'
                                    }
                                </Text>

                            </TouchableOpacity>
                        )}


                    {/* Toggle Theme Button */}
                    <TouchableOpacity onPress={toggleDarkMode} style={styles.toggleButton}>
                        <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
                            <Ionicons
                                name={isDarkMode ? "sunny" : "moon"}
                                size={26}
                                color={isDarkMode ? "#FFD700" : "black"}
                            />
                        </Animated.View>
                    </TouchableOpacity>
                </View>
            </View>
            <View style={{ height: 2, width: '100%', backgroundColor: isDarkMode ? '#EAE4D5' : '#B6B09F', marginBottom: 10 }}></View>
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
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'black',
        width: 100,
    },
    darkTitle: {
        color: '#F5F5F5',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    premiumButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
        backgroundColor: 'rgba(255, 223, 0, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderRadius: 20,
    },
    premiumText: {
        marginLeft: 5,
        color: '#FFF085',
        fontWeight: '600',
        fontSize: 16
    },
    toggleButton: {
        padding: 10,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 0, 0, 0.2)',
    },
});

export default Header;