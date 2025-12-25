import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';


const ComingSoon = () => {

    return (
        <View style={styles.ComingSoon}>

            <View style={styles.lottieContainer}>
                <LottieView
                    source={require('../../assets/coming_soon.json')}
                    autoPlay
                    loop
                    speed={.8}
                    style={styles.lottie}
                />
            </View>

        </View>
    );
};

const styles = StyleSheet.create({
    ComingSoon: {
        flex: 1,
        backgroundColor: 'transparent',
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },    
    lottie: {
        height: 250,
        width: 250,
        marginBottom : 100
    },
    lottieContainer : {
        justifyContent : 'center',
        alignItems : 'center',
    }
});

export default ComingSoon;