import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, StatusBar, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { scaleFont } from "../components/ScaleFont"
const { width, height } = Dimensions.get('window');

const LoadingScreen = ({ progress }) => {
    // Animation values
    const logoScale = useRef(new Animated.Value(0.8)).current;
    const circularProgress = useRef(new Animated.Value(0)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const titleOpacity = useRef(new Animated.Value(0)).current;
    const barOpacity = useRef(new Animated.Value(0)).current;
    const percentageOpacity = useRef(new Animated.Value(0)).current;
    const percentageScale = useRef(new Animated.Value(0.8)).current;
    const shimmer = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(1)).current;
    const gradientShift = useRef(new Animated.Value(0)).current;
    const sparkle1 = useRef(new Animated.Value(0)).current;
    const sparkle2 = useRef(new Animated.Value(0)).current;
    const sparkle3 = useRef(new Animated.Value(0)).current;
    const barFillAnimation = useRef(new Animated.Value(0)).current;
    const glowAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        StatusBar.setBarStyle('dark-content');
        if (Platform.OS === 'android') {
            StatusBar.setBackgroundColor('#89f7fe'); // Your theme
        }
    }, []);

    // Initialize animations on mount
    useEffect(() => {
        // Logo entrance animation
        Animated.sequence([
            Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.parallel([
                Animated.spring(logoScale, {
                    toValue: 1,
                    tension: 100,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(titleOpacity, {
                    toValue: 1,
                    duration: 600,
                    delay: 200,
                    useNativeDriver: true,
                })
            ]),
        ]).start();

        // Bar entrance animation
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(barOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(percentageOpacity, {
                    toValue: 1,
                    duration: 500,
                    delay: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(percentageScale, {
                    toValue: 1,
                    tension: 100,
                    friction: 8,
                    delay: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }, 300);

        // Continuous animations
        // Circular progress animation
        Animated.timing(circularProgress, {
            toValue: progress / 100,
            duration: 500,
            useNativeDriver: true,
        }).start();

        // Pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 1.1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Shimmer effect
        Animated.loop(
            Animated.timing(shimmer, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
            })
        ).start();

        // Gradient shift
        Animated.loop(
            Animated.timing(gradientShift, {
                toValue: 1,
                duration: 4000,
                useNativeDriver: false,
            })
        ).start();

        // Sparkle animations
        const createSparkleAnimation = (sparkleValue, delay) => {
            setTimeout(() => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(sparkleValue, {
                            toValue: 1,
                            duration: 800,
                            useNativeDriver: true,
                        }),
                        Animated.timing(sparkleValue, {
                            toValue: 0,
                            duration: 800,
                            useNativeDriver: true,
                        }),
                        Animated.delay(Math.random() * 2000 + 1000),
                    ])
                ).start();
            }, delay);
        };

        createSparkleAnimation(sparkle1, 2000);
        createSparkleAnimation(sparkle2, 3000);
        createSparkleAnimation(sparkle3, 4000);

        // Glow animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnimation, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(glowAnimation, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    // Update circular progress when progress changes
    useEffect(() => {
        Animated.timing(circularProgress, {
            toValue: progress / 100,
            duration: 500,
            useNativeDriver: true,
        }).start();

        Animated.timing(barFillAnimation, {
            toValue: progress,
            duration: 500,
            useNativeDriver: false,
        }).start();
    }, [progress]);

    // Interpolated values

    const shimmerTranslate = shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [-width, width],
    });

    const barFillWidth = barFillAnimation.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
        extrapolate: 'clamp',
    });

    const glowOpacity = glowAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.8],
    });

    const gradientColors = gradientShift.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [
            ['#89f7fe', '#fad0c4'],
            ['#a8edea', '#fed6e3'],
            ['#89f7fe', '#fad0c4'],
        ],
    });

    return (
        <Animated.View style={styles.container}>
            <LinearGradient colors={["#89f7fe", "#fad0c4"]} style={styles.gradient}>
                {/* Sparkle effects */}
                <Animated.View style={[
                    styles.sparkle,
                    {
                        top: height * 0.2,
                        left: width * 0.2,
                        opacity: sparkle1,
                        transform: [{ scale: sparkle1 }]
                    }
                ]}>
                    <Text style={styles.sparkleText}>✨</Text>
                </Animated.View>

                <Animated.View style={[
                    styles.sparkle,
                    {
                        top: height * 0.3,
                        right: width * 0.15,
                        opacity: sparkle2,
                        transform: [{ scale: sparkle2 }]
                    }
                ]}>
                    <Text style={styles.sparkleText}>⭐</Text>
                </Animated.View>

                <Animated.View style={[
                    styles.sparkle,
                    {
                        bottom: height * 0.25,
                        left: width * 0.1,
                        opacity: sparkle3,
                        transform: [{ scale: sparkle3 }]
                    }
                ]}>
                    <Text style={styles.sparkleText}>✨</Text>
                </Animated.View>

                {/* Animated logo with circular progress */}
                <Animated.View style={[
                    styles.logoContainer,
                    {
                        opacity: logoOpacity,
                    }
                ]}>

                    <Image
                        style={styles.loadingImage}
                        source={require('../../assets/updatedLogo1.png')}
                    />
                </Animated.View>

                {/* Animated progress bar */}
                <Animated.View style={[
                    styles.barContainer,
                    {
                        opacity: barOpacity,
                    }
                ]}>
                    <View style={styles.barBackground}>
                        {/* Shimmer effect */}
                        <Animated.View style={[
                            styles.shimmer,
                        ]} />

                        {/* Progress fill */}
                        <Animated.View style={[
                            styles.barFill,
                            {
                                width: barFillWidth,
                            }
                        ]} />

                        {/* Progress highlight */}
                        <Animated.View style={[
                            styles.barHighlight,
                            {
                                width: barFillWidth,
                            }
                        ]} />
                    </View>
                </Animated.View>

                {/* Animated percentage */}
                <Animated.Text style={[
                    styles.percentage,
                    {
                        opacity: percentageOpacity,
                        transform: [{ scale: percentageScale }]
                    }
                ]}>
                    {Math.floor(progress)}%
                </Animated.Text>

                {/* Loading dots animation */}
                <View style={styles.dotsContainer}>
                    {[0, 1, 2, 3, 4].map((index) => (
                        <Animated.View
                            key={index}
                            style={[
                                styles.dot,
                                {
                                    opacity: shimmer,
                                    transform: [{
                                        scale: shimmer.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.5, 1.2],
                                        })
                                    }]
                                }
                            ]}
                        />
                    ))}
                </View>
            </LinearGradient>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    logoContainer: {
        position: 'relative',
        marginBottom: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingImage: {
        height: 150,
        width: 150,
        borderRadius: 75,
    },
    title: {
        fontSize: scaleFont(28),
        color: 'green',
        marginBottom: 30,
        fontWeight: '800',
        textShadowColor: 'rgba(255, 255, 255, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    barContainer: {
        width: '85%',
        marginBottom: 20,
    },
    barBackground: {
        width: '100%',
        height: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    barFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 12,
        position: 'absolute',
        left: 0,
        top: 0,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 5,
    },
    barHighlight: {
        height: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderRadius: 12,
        position: 'absolute',
        left: 0,
        top: 0,
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.11)',
        width: 50,
        transform: [{ skewX: '-20deg' }],
    },
    percentage: {
        marginTop: 15,
        color: 'green',
        fontSize: scaleFont(24),
        fontWeight: 'bold',
        textShadowColor: 'rgba(255, 255, 255, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    sparkle: {
        position: 'absolute',
    },
    sparkleText: {
        fontSize: scaleFont(30),
        color: '#ffd700',
    },
    dotsContainer: {
        flexDirection: 'row',
        marginTop: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 4,
        backgroundColor: 'rgba(44, 62, 80, 0.6)',
        marginHorizontal: 4,
        marginTop: 4
    },
});

export default LoadingScreen;