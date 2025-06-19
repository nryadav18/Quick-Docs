import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Dimensions,
    Animated,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useUserStore from '../store/userStore';

const { width, height } = Dimensions.get('window');


const AnimatedBar = ({ height, color, delay, maxHeight = 150 }) => {
    const animatedHeight = useRef(new Animated.Value(0)).current;
    const animatedOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
                Animated.timing(animatedHeight, {
                    toValue: (height / 100) * maxHeight,
                    duration: 800,
                    useNativeDriver: false,
                }),
                Animated.timing(animatedOpacity, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: false,
                }),
            ]),
        ]).start();
    }, [height]);

    return (
        <Animated.View
            style={[
                styles.bar,
                {
                    height: animatedHeight,
                    opacity: animatedOpacity,
                },
            ]}
        >
            <LinearGradient
                colors={color}
                style={styles.barGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            />
        </Animated.View>
    );
};

const CircularProgress = ({ percentage, size = 100, strokeWidth = 8, color }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const circleRef = useRef();

    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;

    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: percentage,
            duration: 1500,
            useNativeDriver: false,
        }).start();
    }, [percentage]);

    return (
        <View style={{ width: size, height: size }}>
            <Animated.View
                style={[
                    styles.circularProgress,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        borderWidth: strokeWidth,
                        borderColor: color + '30',
                    },
                ]}
            >
                <Animated.View
                    style={[
                        styles.circularProgressFill,
                        {
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            borderWidth: strokeWidth,
                            borderColor: color,
                            transform: [
                                {
                                    rotate: animatedValue.interpolate({
                                        inputRange: [0, 100],
                                        outputRange: ['0deg', '360deg'],
                                    }),
                                },
                            ],
                        },
                    ]}
                />
                <View style={styles.circularProgressCenter}>
                    <Text style={[styles.percentageText, { color }]}>
                        {Math.round(percentage)}%
                    </Text>
                </View>
            </Animated.View>
        </View>
    );
};

const StatCard = ({ title, value, subtitle, color, delay }) => {
    const animatedScale = useRef(new Animated.Value(0)).current;
    const animatedOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
                Animated.spring(animatedScale, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.statCard,
                {
                    transform: [{ scale: animatedScale }],
                    opacity: animatedOpacity,
                },
            ]}
        >
            <LinearGradient
                colors={[color + '20', color + '10']}
                style={styles.statCardGradient}
            >
                <View style={[styles.statIcon, { backgroundColor: color }]} />
                <Text style={styles.statTitle}>{title}</Text>
                <Text style={[styles.statValue, { color }]}>{value}</Text>
                <Text style={styles.statSubtitle}>{subtitle}</Text>
            </LinearGradient>
        </Animated.View>
    );
};

export const AnalyticsDashboard = () => {
    const [selectedPeriod, setSelectedPeriod] = useState('daily');
    const [data, setData] = useState([]);
    const user = useUserStore((state) => state.user);

    const [analyticsData, setAnalyticsData] = useState({
        daily: [],
        weekly: [],
        monthly: [],
    });
    const username = user?.username; // Replace with actual logged-in user's username

    const scrollY = useRef(new Animated.Value(0)).current;

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [1, 0.8],
        extrapolate: 'clamp',
    });


    useEffect(() => {
        const fetchAnalyticsFromStore = () => {
            const dashboard = useUserStore.getState().getDashboardData();
            console.log("📊 Zustand dashboard data:", dashboard);

            setAnalyticsData(dashboard);
            setData(dashboard[selectedPeriod] || []);
        };

        fetchAnalyticsFromStore();
    }, []);



    const periods = [
        { key: 'daily', label: 'Daily' },
        { key: 'weekly', label: 'Weekly' },
        { key: 'monthly', label: 'Monthly' },
    ];


    const maxValue = Math.max(...data.map(d => Math.max(d.chatbot, d.voice)));

    const totalChatbot = data.reduce((sum, item) => sum + item.chatbot, 0);
    const totalVoice = data.reduce((sum, item) => sum + item.voice, 0);
    const totalQuestions = totalChatbot + totalVoice;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0f0c29" />

            {/* Animated Header */}
            <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
                <View
                    style={styles.headerGradient}
                >
                    <Text style={styles.headerTitle}>Analytics Dashboard</Text>
                    <Text style={styles.headerSubtitle}>AI Assistant Insights</Text>
                </View>
            </Animated.View>

            <Animated.ScrollView
                style={styles.scrollView}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
            >
                {/* Stats Cards */}
                <View style={styles.statsContainer}>
                    <StatCard
                        title="Total Questions"
                        value={totalQuestions.toLocaleString()}
                        subtitle="All time"
                        color="#4ECDC4"
                        delay={100}
                    />
                    <StatCard
                        title="Chatbot Queries"
                        value={totalChatbot.toLocaleString()}
                        subtitle={`${parseInt((totalChatbot / totalQuestions) * 100) || 0}%`}
                        color="#45B7D1"
                        delay={200}
                    />
                    <StatCard
                        title="Voice Commands"
                        value={totalVoice.toLocaleString()}
                        subtitle={`${parseInt((totalVoice / totalQuestions) * 100) || 0}%`}
                        color="#F39C12"
                        delay={300}
                    />
                </View>

                {/* Period Selector */}
                <View style={styles.periodSelector}>
                    {periods.map((period) => (
                        <TouchableOpacity
                            key={period.key}
                            style={[
                                styles.periodButton,
                                selectedPeriod === period.key && styles.periodButtonActive,
                            ]}
                            onPress={() => {
                                setSelectedPeriod(period.key);
                                setData(analyticsData[period.key] || []);
                            }}

                        >
                            <Text
                                style={[
                                    styles.periodButtonText,
                                    selectedPeriod === period.key && styles.periodButtonTextActive,
                                ]}
                            >
                                {period.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Bar Chart */}
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>Questions Over Time</Text>
                    <View style={styles.chart}>
                        <View style={styles.chartBars}>
                            {data.map((item, index) => (
                                <View key={index} style={styles.barGroup}>
                                    <View style={styles.barPair}>
                                        <AnimatedBar
                                            height={(item.chatbot / maxValue) * 100}
                                            color={['#45B7D1', '#2E86AB']}
                                            delay={index * 100}
                                        />
                                        <AnimatedBar
                                            height={(item.voice / maxValue) * 100}
                                            color={['#F39C12', '#E67E22']}
                                            delay={index * 100 + 50}
                                        />
                                    </View>
                                    <Text style={styles.barLabel}>
                                        {item.day || item.week || item.month}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Legend */}
                    <View style={styles.legend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: '#45B7D1' }]} />
                            <Text style={styles.legendText}>Chatbot</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: '#F39C12' }]} />
                            <Text style={styles.legendText}>Voice</Text>
                        </View>
                    </View>
                </View>

                {/* Progress Circles */}
                <View style={styles.progressContainer}>
                    <Text style={styles.chartTitle}>Usage Distribution</Text>
                    <View style={styles.progressRow}>
                        <View style={styles.progressItem}>
                            <CircularProgress
                                percentage={totalQuestions === 0 ? 0: (totalChatbot / totalQuestions) * 100}
                                color="#45B7D1"
                                size={120}
                            />
                            <Text style={styles.progressLabel}>Chatbot</Text>
                        </View>
                        <View style={styles.progressItem}>
                            <CircularProgress
                                percentage={totalQuestions === 0 ? 0 : (totalVoice / totalQuestions) * 100}
                                color="#F39C12"
                                size={120}
                            />
                            <Text style={styles.progressLabel}>Voice</Text>
                        </View>
                    </View>
                </View>

                {/* Recent Activity */}
                <View style={styles.recentActivity}>
                    <Text style={styles.chartTitle}>Recent Activity</Text>
                    {data.slice(-3).map((item, index) => (
                        <Animated.View
                            key={index}
                            style={[
                                styles.activityItem,
                                {
                                    opacity: scrollY.interpolate({
                                        inputRange: [0, 300 + index * 50],
                                        outputRange: [0, 1],
                                        extrapolate: 'clamp',
                                    }),
                                    transform: [
                                        {
                                            translateY: scrollY.interpolate({
                                                inputRange: [0, 300 + index * 50],
                                                outputRange: [50, 0],
                                                extrapolate: 'clamp',
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        >
                            <View style={styles.activityLeft}>
                                <Text style={styles.activityDay}>
                                    {item.day || item.week || item.month}
                                </Text>
                                <Text style={styles.activityDate}>{item.date || 'Recent'}</Text>
                            </View>
                            <View style={styles.activityRight}>
                                <View style={styles.activityStats}>
                                    <Text style={styles.activityChatbot}>{item.chatbot} chatbot</Text>
                                    <Text style={styles.activityVoice}>{item.voice} voice</Text>
                                </View>
                            </View>
                        </Animated.View>
                    ))}
                </View>
            </Animated.ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f23',
    },
    header: {
        height: 120,
        paddingTop: 40,
    },
    headerGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f0c29'
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#B0B0B0',
    },
    scrollView: {
        flex: 1,
        backgroundColor: '#0f0c29'
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 20,
        justifyContent: 'space-between',
    },
    statCard: {
        flex: 1,
        marginHorizontal: 5,
        borderRadius: 15,
        overflow: 'hidden',
    },
    statCardGradient: {
        padding: 15,
        alignItems: 'center',
    },
    statIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginBottom: 10,
    },
    statTitle: {
        fontSize: 12,
        color: '#888',
        marginBottom: 5,
        textAlign: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    statSubtitle: {
        fontSize: 10,
        color: '#666',
    },
    periodSelector: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    periodButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 15,
        marginHorizontal: 5,
        borderRadius: 20,
        backgroundColor: '#1a1a2e',
        alignItems: 'center',
    },
    periodButtonActive: {
        backgroundColor: '#4ECDC4',
    },
    periodButtonText: {
        color: '#888',
        fontSize: 14,
        fontWeight: '500',
    },
    periodButtonTextActive: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    chartContainer: {
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    chartTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 20,
    },
    chart: {
        backgroundColor: '#1a1a2e',
        borderRadius: 15,
        padding: 20,
    },
    chartBars: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: 180,
    },
    barGroup: {
        alignItems: 'center',
        flex: 1,
    },
    barPair: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 10,
    },
    bar: {
        width: 15,
        marginHorizontal: 2,
        borderRadius: 8,
        overflow: 'hidden',
    },
    barGradient: {
        flex: 1,
        borderRadius: 8,
    },
    barLabel: {
        color: '#888',
        fontSize: 12,
        marginTop: 5,
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 15,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 15,
    },
    legendColor: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 5,
    },
    legendText: {
        color: '#888',
        fontSize: 12,
    },
    progressContainer: {
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#1a1a2e',
        borderRadius: 15,
        paddingVertical: 30,
    },
    progressItem: {
        alignItems: 'center',
    },
    progressLabel: {
        color: '#888',
        fontSize: 14,
        marginTop: 10,
    },
    circularProgress: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    circularProgressFill: {
        position: 'absolute',
        borderTopColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
    },
    circularProgressCenter: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    percentageText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    recentActivity: {
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    activityItem: {
        flexDirection: 'row',
        backgroundColor: '#1a1a2e',
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        alignItems: 'center',
    },
    activityLeft: {
        flex: 1,
    },
    activityDay: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    activityDate: {
        color: '#888',
        fontSize: 12,
        marginTop: 2,
    },
    activityRight: {
        alignItems: 'flex-end',
    },
    activityStats: {
        alignItems: 'flex-end',
    },
    activityChatbot: {
        color: '#45B7D1',
        fontSize: 14,
        fontWeight: '500',
    },
    activityVoice: {
        color: '#F39C12',
        fontSize: 14,
        fontWeight: '500',
        marginTop: 2,
    },
});