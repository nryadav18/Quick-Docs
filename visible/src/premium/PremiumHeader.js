import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from 'react-native-vector-icons'

const PremiumHeader = ({ title }) => {
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.safeArea}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <AntDesign name="arrowleft" size={30} />
            </TouchableOpacity>
            <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: '#F3C623',
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 20
    },
    header: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'black',
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

export default PremiumHeader;