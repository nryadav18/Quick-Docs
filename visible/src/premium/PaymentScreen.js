import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import useUserStore from '../store/userStore';

const UpiPaymentScreen = ({ navigation }) => {
    const [upiId, setUpiId] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [orderId, setOrderId] = useState('');
    const [paymentSuccessful, setPaymentSuccessful] = useState(false); // Track payment success
    const user = useUserStore((state) => state.user);

    const initiatePayment = async () => {
        if (!upiId.includes('@')) {
            Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID like user@upi');
            return;
        }
        const username = user.username;
        const id = 'ORDER_' + `${username}_` + Date.now();
        setOrderId(id);
        setLoading(true);
        setStatus('Sending payment request...');

        try {
            // Replace with your production API URL
            const res = await axios.post('https://quick-docs-app-backend.onrender.com/initiate-upi', {
                upi_id: upiId,
                order_id: id,
                amount: 1.00,
                username: username
            });

            console.log(res.data);
            setStatus('UPI request sent. Please approve in your UPI app.');

            // Call the status check API once here
            checkStatus(id, res.data.payment_url);

        } catch (error) {
            console.error(error);
            setStatus('Payment initiation failed');
            setLoading(false);
        }
    };

    const checkStatus = async (id, paymentUrl) => {
        try {
            // Replace with your production API URL
            const res = await axios.get(`https://quick-docs-app-backend.onrender.com/check-status/${id}`);
            const orderStatus = res.data.order_status;

            if (orderStatus === 'PAID') {
                setLoading(false);
                setPaymentSuccessful(true);
                setStatus('Payment Successful');
                setTimeout(() => {
                    navigation.goBack();
                }, 3000); // Go back after 3 seconds
            } else if (orderStatus === 'FAILED' || orderStatus === 'EXPIRED') {
                setLoading(false);
                Alert.alert('❌ Payment Failed or Expired');
                navigation.goBack();
            }
        } catch (err) {
            setLoading(false);
            Alert.alert('Error', 'Failed to check payment status');
            navigation.goBack();
        }
    };

    return (
        <View style={styles.container}>
            {paymentSuccessful ? (
                <View style={styles.successContainer}>
                    <Text style={styles.successMessage}>Payment Successful!</Text>
                </View>
            ) : (
                <>
                    <Text style={styles.label}>Enter UPI ID</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="example@upi"
                        placeholderTextColor="#666"
                        value={upiId}
                        onChangeText={setUpiId}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="default"
                    />

                    <Button title="Pay ₹1 via UPI" onPress={initiatePayment} color="#E9A319" />

                    {loading && (
                        <View style={styles.loading}>
                            <ActivityIndicator size="large" color="#E9A319" />
                            <Text style={styles.status}>{status}</Text>
                        </View>
                    )}
                </>
            )}
        </View>
    );
};

export default UpiPaymentScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        paddingTop: 50,
        backgroundColor: '#fff',
    },
    label: {
        fontSize: 18,
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#999',
        borderRadius: 5,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
    },
    loading: {
        marginTop: 30,
        alignItems: 'center',
    },
    status: {
        marginTop: 12,
        fontSize: 16,
        color: '#555',
    },
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successMessage: {
        fontSize: 24,
        color: '#28a745',
        fontWeight: 'bold',
    },
});
