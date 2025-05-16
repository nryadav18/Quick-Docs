import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
} from 'react-native';
import LottieView from 'lottie-react-native';
import Animated, {
    useSharedValue,
    withSpring,
    useAnimatedStyle,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

const PaymentSuccessScreen = ({ navigation }) => {
    const badgeRef = useRef(null);
    const scale = useSharedValue(0); // Start with invisible

    useEffect(() => {
        // Show badge animation after payment animation completes
        const badgeTimer = setTimeout(() => {
            badgeRef.current?.play(); // Play premium badge
            scale.value = withSpring(1, { damping: 10 }); // Animate scale in
        }, 2300); // After 2s

        const navTimer = setTimeout(() => {
            navigation.replace('Home');
        }, 5000);

        return () => {
            clearTimeout(badgeTimer);
            clearTimeout(navTimer);
        };
    }, []);

    const animatedBadgeStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <LinearGradient colors={["#F3C623", "#F3FEB8", "#F3C623"]} style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F3C623" />

            {/* Payment Success Animation */}
            <LottieView
                source={require('../../assets/PaymentSuccess.json')}
                autoPlay
                loop={false}
                speed={.7}
                style={styles.lottie}
            />

            {/* Premium Badge Animation */}
            <Animated.View style={[styles.badge, animatedBadgeStyle]}>
                <LottieView
                    ref={badgeRef}
                    source={require('../../assets/Premium_Badge.json')}
                    loop
                    style={{ width: 230, height: 230 }}
                />
            </Animated.View>

            {/* Messages */}
            <Text style={styles.title}>Payment Successful!</Text>
            <Text style={styles.subtitle}>Thank you for your purchase.</Text>

            {/* Optional: Manual Continue */}
            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.replace('Home')}
            >
                <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
        </LinearGradient>
    );
};

export default PaymentSuccessScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    lottie: {
        width: 350,
        height: 350,
        zIndex: 1,
    },
    badge: {
        position: 'absolute',
        top: '32%',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        zIndex: 1,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
        zIndex: 1,
    },
    button: {
        backgroundColor: '#E9A319',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25,
        zIndex: 1,
        marginBottom : 50
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
