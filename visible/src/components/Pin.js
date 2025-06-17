import { StyleSheet, Text, View, Modal, KeyboardAvoidingView, TextInput, TouchableOpacity, Platform } from 'react-native'
import React, { useState } from 'react'

export const SetPinModal = ({ visible, onOk, onChangeText, handleSetPin }) => {

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onOk}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : null}
                style={styles.pinOverlay}
            >
                <View style={styles.pinContainer}>
                    <Text style={styles.pinTitle}>🔐 Set 6 Digit PIN</Text>

                    <TextInput
                        placeholder="******"
                        placeholderTextColor="#aaa"
                        keyboardType="numeric"
                        secureTextEntry={true}
                        style={styles.pinInput}
                        onChangeText={onChangeText}
                        returnKeyType="done"
                        blurOnSubmit={false} // prevent keyboard from dismissing on submit
                        onSubmitEditing={handleSetPin}
                        maxLength={6}
                    />

                    <TouchableOpacity
                        style={styles.pinButton}
                        onPress={handleSetPin}
                    >
                        <Text style={styles.pinButtonText}>Set PIN</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    )
}

export const GetPinModal = ({ visible, onOk, onChangeText, handleGetPin }) => {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onOk}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : null}
                style={styles.pinOverlay}
            >
                <View style={styles.pinContainer}>
                    <Text style={styles.pinTitle}>🔐 Enter PIN to Authorize</Text>

                    <View>
                        <TextInput
                            placeholder="******"
                            placeholderTextColor="#aaa"
                            keyboardType="numeric"
                            secureTextEntry={true}
                            style={styles.pinInput}
                            onChangeText={onChangeText}
                            returnKeyType="done"
                            blurOnSubmit={false} // prevent keyboard from dismissing on submit
                            onSubmitEditing={handleGetPin} // tick/enter button on keyboard
                            maxLength={6}
                        />
                        
                    </View>

                    <TouchableOpacity
                        style={styles.pinButton}
                        onPress={handleGetPin}
                    >
                        <Text style={styles.pinButtonText}>Authorize</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    pinOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    pinContainer: {
        width: '100%',
        padding: 70,
        backgroundColor: 'rgb(118, 114, 114)',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 15,
        gap: 30,
    },
    pinTitle: {
        fontSize: 24,
        fontWeight: '600',
        marginBottom: 20,
        color: 'white',
    },
    pinInput: {
        width: '80%',
        fontSize: 26,
        fontWeight: 800,
        paddingVertical: 10,
        textAlign: 'center',
        borderBottomWidth: 1,
        borderColor: '#ccc',
        marginBottom: 25,
        color: 'white',
    },
    pinButton: {
        backgroundColor: '#00796b',
        paddingVertical: 12,
        paddingHorizontal: 50,
        borderRadius: 30,
    },
    pinButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
})