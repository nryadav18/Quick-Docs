import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Dimensions } from 'react-native'; 
import { scaleFont } from "../components/ScaleFont"
const {width, height} = Dimensions.get('screen')

const Note = () => {
    return (
        <View style={styles.Note}>
            <Text style={styles.text}>Made with ❤️ &copy; N R Yadav</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    Note: {
        position: 'absolute',
        bottom: 0,
        width: width,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent : 'center',
    },
    text: {
        fontSize: scaleFont(16),
        color: '#333',
        fontWeight : 600
    },
});

export default Note;
