import React, { useEffect, useState } from 'react';
import { Animated, Text, View, Easing } from 'react-native';

const FadeInText = ({ children, style }) => {
    const lines = children.split('\n').filter(line => line.trim() !== '');
    const [visibleLines, setVisibleLines] = useState([]);
    const [fadeAnims, setFadeAnims] = useState([]);

    useEffect(() => {
        let currentIndex = 0;

        const showNextLine = () => {
            if (currentIndex < lines.length) {
                setVisibleLines(prev => [...prev, lines[currentIndex]]);
                const anim = new Animated.Value(0);
                setFadeAnims(prev => [...prev, anim]);

                Animated.timing(anim, {
                    toValue: 1,
                    duration: 800, // longer duration for smoother fade
                    easing: Easing.out(Easing.cubic), // easing for smooth curve
                    useNativeDriver: true,
                }).start();

                currentIndex++;
                setTimeout(showNextLine, 900); // longer delay between paragraphs
            }
        };

        showNextLine();
    }, []);

    return (
        <View style={{ flexDirection: 'column', flexWrap: 'wrap' }}>
            {visibleLines.map((line, index) => (
                <Animated.View
                    key={index}
                    style={{ opacity: fadeAnims[index], marginBottom: 16 }}
                >
                    <Text style={style}>{line}</Text>
                </Animated.View>
            ))}
        </View>
    );
};

export default FadeInText;
