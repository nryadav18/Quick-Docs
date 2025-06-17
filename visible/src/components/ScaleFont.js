import { PixelRatio } from "react-native";

export const scaleFont = (size) => {
    return (size / PixelRatio.getFontScale());
}