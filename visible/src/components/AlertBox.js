import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native"
import { AntDesign } from "@expo/vector-icons"

// Error Alert (Red) - For validation errors and login failures
export const ErrorAlert = ({ visible, title, message, onOk }) => {
    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onOk}>
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <View style={styles.iconContainer}>
                        <AntDesign name="closecircle" size={40} color="#FF3B30" />
                    </View>
                    <Text style={styles.modalTitle}>{title}</Text>
                    <Text style={styles.modalText}>{message}</Text>

                    <TouchableOpacity style={[styles.button, styles.errorButton]} onPress={onOk}>
                        <Text style={styles.buttonText}>OK</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    )
}

// Warning Alert (Yellow) - For warnings like weak password
export const WarningAlert = ({ visible, title, message, onOk, onCancel }) => {
    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onCancel}>
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <View style={styles.iconContainer}>
                        <AntDesign name="exclamationcircle" size={40} color="#FFCC00" />
                    </View>
                    <Text style={styles.modalTitle}>{title}</Text>
                    <Text style={styles.modalText}>{message}</Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.button, styles.warningButton]} onPress={onOk}>
                            <Text style={styles.buttonText}>Continue</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

// Success Alert (Green) - For successful operations
export const SuccessAlert = ({ visible, title, message, onOk }) => {
    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onOk}>
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <View style={styles.iconContainer}>
                        <AntDesign name="checkcircle" size={40} color="#00796b" />
                    </View>
                    <Text style={styles.modalTitle}>{title}</Text>
                    <Text style={styles.modalText}>{message}</Text>

                    <TouchableOpacity style={[styles.button, styles.successButton]} onPress={onOk}>
                        <Text style={styles.buttonText}>OK</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 15,
        padding: 25,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: "85%",
    },
    iconContainer: {
        marginBottom: 15,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 15,
        textAlign: "center",
        color: "#333",
    },
    modalText: {
        marginBottom: 20,
        textAlign: "center",
        lineHeight: 22,
        color: "#666",
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
    },
    button: {
        borderRadius: 10,
        padding: 12,
        elevation: 2,
        minWidth: 100,
        alignItems: "center",
    },
    errorButton: {
        backgroundColor: "#FF3B30",
        width: "100%",
    },
    warningButton: {
        backgroundColor: "#FFCC00",
        flex: 1,
        marginLeft: 10,
    },
    successButton: {
        backgroundColor: "#00796b",
        width: "100%",
    },
    cancelButton: {
        backgroundColor: "#f8f9fa",
        borderWidth: 1,
        borderColor: "#ddd",
        flex: 1,
    },
    buttonText: {
        color: "white",
        fontWeight: "bold",
        textAlign: "center",
        fontSize: 16,
    },
    cancelButtonText: {
        color: "#555",
        textAlign: "center",
        fontWeight: "600",
        fontSize: 16,
    },
})
