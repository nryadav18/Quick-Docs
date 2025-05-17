import React, { useState, useEffect, useRef } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Animated,
    Platform,
    StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from "@react-navigation/native"
import RazorpayCheckout from 'react-native-razorpay';
import axios from 'axios';
import useUserStore from '../store/userStore';

const { width } = Dimensions.get('window');

const plans = {
    Pro: { name: 'Pro Plan', price: '1', type: 'Pro', features: [{ label: '10 File Uploads', available: true }, { label: '3 AI Prompts / Day', available: true }, { label: 'Advanced Artificial Intellegence', available: false }, { label: 'Premium UI Enhancement', available: false }, { label: 'Special Birthday Gift', available: false },], color: '#E9A319' },
    Ultra_Pro: { name: 'Ultra Pro Plan', price: '2', type: 'Ultra Pro', features: [{ label: 'Unlimited File Uploads', available: true }, { label: '10 AI Prompts / Day', available: true }, { label: 'Special Birthday Gift', available: true }, { label: 'Premium UI Enhancement', available: false }, { label: 'Advanced Articial Intelligence', available: false },], color: '#D98324' },
    Ultra_Pro_Max: { name: 'Ultra Pro Max Plan', price: '3', type: 'Ultra Pro Max', features: [{ label: 'Unlimited File Uploads', available: true }, { label: 'Unlimited AI Prompts / Day', available: true }, { label: 'Special Birthday Gift', available: true }, { label: 'Premium UI Enhancement', available: true }, { label: 'Advanced Articial Intelligence', available: true },], color: '#EB8317' },
};

export default function Premium() {
    const planKeys = Object.keys(plans);
    const [selected, setSelected] = useState(planKeys[0]);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const user = useUserStore((state) => state.user);
    const navigation = useNavigation()
    const [premiumTime, setPremiumTime] = useState('');

    useEffect(() => {

        StatusBar.setBarStyle('dark-content');

        if (Platform.OS === 'android') {
            StatusBar.setBackgroundColor('#F3C623'); // Your theme
        }
    }, []);

    const handleSelect = (planKey) => {
        const currentIndex = planKeys.indexOf(selected);
        const nextIndex = planKeys.indexOf(planKey);

        slideAnim.setValue(currentIndex > nextIndex ? -width : width);
        setSelected(planKey);
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
        }).start();
    };

    const sendPushNotification = async (expoPushToken, title, body) => {
        try {
            await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: expoPushToken,
                    sound: 'default',
                    title,
                    body,
                }),
            });
        } catch (error) {
            console.warn('Push notification failed:', error);
        }
    };

    const makePremiumUser = (plan) => {
        const { setUser } = useUserStore.getState();
        const currentUser = useUserStore.getState().user;

        if (!currentUser) {
            console.warn("User is null, cannot make premium");
            return;
        }

        const currentTimestamp = premiumTime ?? Date.now(); // fallback to current timestamp if premiumTime is falsy

        const updatedUser = {
            ...currentUser,
            premiumuser: true,
            premiumDetails: Array.isArray(currentUser?.premiumDetails)
                ? [
                    ...currentUser.premiumDetails,
                    { type: plan.name, timestamp: currentTimestamp }
                ]
                : [{ type: plan.name, timestamp: currentTimestamp }],
        };

        console.log("Updated User:", updatedUser);
        setUser(updatedUser);
    };



    const handleBuyNow = async (plan) => {
        try {
            const response = await axios.post('https://2fe7-2409-40f0-1157-f4d9-e844-ff21-9e29-3327.ngrok-free.app/create-order', {
                amount: parseInt(plan.price),
                username: user?.username
            });
            const { order } = response.data;

            if (!order) {
                console.log('❌ No order received from backend');
                return;
            }

            var options = {
                description: plan.name,
                image: 'https://storage.googleapis.com/agent-qd-data/logomain.png',
                currency: 'INR',
                key: 'rzp_live_ytSSS6VVuUNHPy',
                amount: order.amount,
                name: 'Quick Docs App',
                order_id: order.id,
                prefill: {
                    email: user?.email,
                    contact: '9876543210',
                    name: user?.name,
                },
                theme: { color: plan.color },
            };

            RazorpayCheckout.open(options)
                .then(async (paymentData) => {
                    console.log('Payment Success:', paymentData);
                    const currentTimestamp = new Date().toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false
                    });
                    console.log(currentTimestamp)
                    setPremiumTime(currentTimestamp);
                    try {
                        const verifyResponse = await axios.post(
                            'https://2fe7-2409-40f0-1157-f4d9-e844-ff21-9e29-3327.ngrok-free.app/verify-payment',
                            {
                                ...paymentData,
                                username: user?.username, // optional
                                planName: plan.name,      // optional
                                premiumTime: currentTimestamp
                            }
                        );

                        console.log(verifyResponse.data)

                        if (verifyResponse.data.success) {
                            console.log('✅ Payment Verified Successfully');
                            if (user?.premiumuser == false) makePremiumUser(plan);
                            if (user?.expoNotificationToken) {
                                console.log(user?.expoNotificationToken)
                                await sendPushNotification(
                                    user?.expoNotificationToken,
                                    'Payment Successfull',
                                    `Thanks for the Trust, Welcome to PRO Club!`
                                );
                            }
                            navigation.navigate('PaymentSuccess');
                        } else {
                            console.warn('⚠️ Payment verification failed on backend');
                        }
                    } catch (verifyError) {
                        console.error('❌ Error verifying payment on backend:', verifyError);
                    }
                })
                .catch((error) => {
                    console.log(`Error: ${error.code} | ${error.description}`);
                });
        } catch (error) {
            console.error('Payment Error:', error);
        }
    };


    return (
        <LinearGradient colors={["#F3C623", "#F3FEB8", "#F3C623"]} style={styles.container}>
            <SafeAreaView style={styles.container}>
                <View style={styles.buttonRow}>
                    {planKeys.map((key) => (
                        <TouchableOpacity
                            key={key}
                            onPress={() => handleSelect(key)}
                            style={[
                                styles.topButton,
                                {
                                    backgroundColor:
                                        selected === key ? plans[key].color : '#E5E7EB',
                                    shadowColor: selected === key ? '#000' : 'transparent',
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.topButtonText,
                                    { color: selected === key ? '#fff' : '#000' },
                                ]}
                            >
                                {key.replace(/_/g, ' ')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Animated.View
                    style={{
                        transform: [{ translateX: slideAnim }],
                        width: '100%',
                        alignItems: 'center',
                    }}
                >
                    <PlanCard plan={plans[selected]} onBuyNow={handleBuyNow} user={user} />
                </Animated.View>
            </SafeAreaView>
        </LinearGradient>
    );
}

const PlanCard = ({ plan, onBuyNow, user }) => {
    const alreadyBought = Array.isArray(user?.premiumDetails)
        ? user?.premiumDetails.some(detail => detail.type === plan.name)
        : false;


    return (
        <View style={[styles.card, { borderColor: plan.color }]}>
            <Text style={[styles.planName, { backgroundColor: plan.color }]}>
                {plan.name}
            </Text>
            <Text style={styles.price}>
                <Text style={{ fontSize: 50 }}>₹{plan.price}</Text>
                <Text style={styles.perMonth}> / Month</Text>
            </Text>

            <View style={styles.features}>
                {plan.features.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                        <Icon
                            name={f.available ? 'check' : 'close'}
                            size={22}
                            color={f.available ? 'green' : 'gray'}
                            style={{ marginRight: 10 }}
                        />
                        <Text
                            style={{
                                color: f.available ? '#000' : '#999',
                                fontWeight: f.available ? 'bold' : 'normal',
                                fontSize: 18,
                            }}
                        >
                            {f.label}
                        </Text>
                    </View>
                ))}
            </View>

            <TouchableOpacity
                style={[
                    styles.button,
                    {
                        backgroundColor: alreadyBought ? '#a8adaa' : plan.color
                    },
                ]}
                onPress={() => !alreadyBought && onBuyNow(plan)}
                disabled={alreadyBought}
            >
                <Text style={styles.buttonText}>
                    {alreadyBought ? 'ALREADY PURCHASED' : 'BUY NOW'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
        width: '100%',
    },
    topButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
        marginHorizontal: 5,
    },
    topButtonText: {
        fontWeight: '700',
        fontSize: 16,
    },
    card: {
        width: width * 0.8,
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 22,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 1, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 4,
        marginBottom: 100
    },
    planName: {
        color: '#fff',
        alignSelf: 'center',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 10,
        fontWeight: '700',
        fontSize: 14,
        marginBottom: 12,
    },
    price: {
        fontWeight: 'bold',
        fontSize: 24,
        color: '#111827',
        textAlign: 'center',
    },
    perMonth: {
        fontSize: 20,
        color: '#6B7280',
    },
    features: {
        marginVertical: 20,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    button: {
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});