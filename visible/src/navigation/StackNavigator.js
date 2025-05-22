import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import SignupScreen from '../screens/SignupScreen';
import BottomTabNavigator from './BottomTabNavigator';
import ViewFilesScreen from '../screens/ViewFilesScreen';
import Premium from '../premium/PremiumCard';
import PremiumHeader from '../premium/PremiumHeader';
import PaymentSuccessScreen from '../premium/PaymentSuccess';
import MultilingualVoiceInput from '../screens/MultiLingual';

const Stack = createStackNavigator();

export default function StackNavigator({ alreadyLoggedIn }) {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {
                alreadyLoggedIn ?
                    <>
                        <Stack.Screen name="Home" component={BottomTabNavigator} />
                        <Stack.Screen name="Files" component={ViewFilesScreen} />
                        <Stack.Screen name="Premium" component={Premium}
                            options={{
                                headerShown: true,
                                header: () => <PremiumHeader title="Premium" />,
                            }}
                        />
                        <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
                        <Stack.Screen name="MultilingualVoiceInput" component={MultilingualVoiceInput} />
                    </>
                    :
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                        <Stack.Screen name="Signup" component={SignupScreen} />
                    </>
            }
        </Stack.Navigator>
    );
}
