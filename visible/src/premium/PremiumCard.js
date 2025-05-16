import React, { useState, useRef } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from "@react-navigation/native"

const { width } = Dimensions.get('window');

const plans = {
    Weekly: {
        name: 'Weekly Plan',
        price: '1',
        type: 'week',
        features: [
            { label: '10 Files Upload', available: true },
            { label: 'Free support 24/7', available: true },
            { label: 'Databases', available: false },
            { label: 'Email', available: false },
            { label: 'Unlimited traffic', available: false },
        ],
        color: '#E9A319',
    },
    Monthly: {
        name: 'Monthly Plan',
        price: '2',
        type: 'month',
        features: [
            { label: 'Unlimited Upload', available: true },
            { label: 'Free support 24/7', available: true },
            { label: 'Databases', available: true },
            { label: 'Email', available: true },
            { label: 'Unlimited traffic', available: false },
        ],
        color: '#D98324',
    },
    Yearly: {
        name: 'Yearly Plan',
        price: '3',
        type: 'year',
        features: [
            { label: 'Unlimited Upload', available: true },
            { label: 'Free support 24/7', available: true },
            { label: 'Databases', available: true },
            { label: 'Email', available: true },
            { label: 'Unlimited traffic', available: true },
        ],
        color: '#EB8317',
    },
};


export default function Premium() {
    const planKeys = Object.keys(plans);
    const [selected, setSelected] = useState(planKeys[0]);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const navigation = useNavigation()

    const checkPaymentStatus = async (orderId) => {
        try {
            const res = await fetch(`https://7f29-2409-40f0-1157-f4d9-9cd3-f5f2-a9bb-feb9.ngrok-free.app/check-status/${orderId}`);
            const data = await res.json();

            if (data.order_status === 'PAID') {
                console.log('✅ Payment successful');
                alert("✅ Payment successful!");
            } else {
                console.log('❌ Payment not completed yet');
                alert("⏳ Payment pending or failed. Try again.");
            }
        } catch (error) {
            console.error(error);
            alert("⚠️ Error checking payment status");
        }
    };


    const handleBuyNow = async (plan) => {
        const order_id = `ORDER_${Date.now()}`;

        try {
            const response = await fetch('https://7f29-2409-40f0-1157-f4d9-9cd3-f5f2-a9bb-feb9.ngrok-free.app/initiate-upi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order_id,
                    amount: plan.price,
                    username: 'Nryadav18',
                    email: 'cserajeswaryadav@gmail.com',
                    phone: '9398542959',
                }),
            });

            const data = await response.json();

            if (data.success && data.paymentLink) {
                console.log("✅ Payment link:", data.paymentLink);
                alert("📩 Payment link sent to your email!");

                // Optionally open the payment link directly
                // Linking.openURL(data.paymentLink);

                // Save order ID in state for later status check
                setTimeout(() => {
                    checkPaymentStatus(order_id); // Auto-check after 5–10 seconds
                }, 10000);
            } else {
                alert("❌ Failed to initiate payment");
            }
        } catch (error) {
            console.error(error);
            alert("⚠️ Error while initiating payment");
        }
    };


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
                                {key}
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
                    <PlanCard plan={plans[selected]} onBuyNow={handleBuyNow} />
                </Animated.View>
            </SafeAreaView>
        </LinearGradient>
    );
}

const PlanCard = ({ plan, onBuyNow }) => (
    <View style={[styles.card, { borderColor: plan.color }]}>
        <StatusBar
            barStyle="dark-content"
            backgroundColor="#F3C623"
        />
        <Text style={[styles.planName, { backgroundColor: plan.color }]}>
            {plan.name}
        </Text>
        <Text style={styles.price}>
            <Text style={{ fontSize: 50 }}>₹{plan.price}</Text>
            <Text style={styles.perMonth}> / {plan.type}</Text>
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
            style={[styles.button, { backgroundColor: plan.color }]}
            onPress={() => onBuyNow(plan)}  // 👈 Fixed here
        >
            <Text style={styles.buttonText}>BUY NOW</Text>
        </TouchableOpacity>

    </View>
);

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
        marginBottom : 100
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