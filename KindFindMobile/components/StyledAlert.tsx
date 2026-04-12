import React from "react";
import { View, Text, Modal, StyleSheet, TouchableOpacity } from "react-native";

interface StyledAlertProps {
    visible: boolean;
    title: string;
    message: string;
    onClose: () => void;
}

const StyledAlert = ({ visible, title, message, onClose }: StyledAlertProps) => {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.alertBox}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>
                    <TouchableOpacity style={styles.button} onPress={onClose}>
                        <Text style={styles.buttonText}>OK</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.85)", // Darker to match your theme
        justifyContent: "center",
        alignItems: "center",
    },
    alertBox: {
        width: "80%",
        backgroundColor: "#121C0C", // Your card background
        borderRadius: 20,
        padding: 25,
        borderWidth: 1,
        borderColor: "#CE6674", // Your accent color
        alignItems: "center",
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#CE6674",
        marginBottom: 10,
    },
    message: {
        fontSize: 16,
        color: "#eef2e4",
        textAlign: "center",
        marginBottom: 20,
    },
    button: {
        backgroundColor: "#CE6674",
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 10,
    },
    buttonText: {
        color: "#FFF",
        fontWeight: "bold",
    },
});

export default StyledAlert;