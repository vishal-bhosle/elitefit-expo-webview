import React, { useRef, useState, useEffect } from "react";
import { SafeAreaView, Text, ScrollView, RefreshControl, Alert, BackHandler } from "react-native";
import { WebView } from "react-native-webview";
import * as Permissions from "expo-permissions"; // Importing Expo permissions
import * as ScreenOrientation from "expo-screen-orientation";

// Your API call function to fetch redirect link
const fetchRedirectLink = async () => {
    try {
        const response = await fetch("https://elitefitforyou.com/api/partner/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                apiKey: "H4VBPJT-APTMBYG-GR4PV4J-Z4GKZKJ",
                apiSecret: "8936bb4b-55b5-45fa-8609-6d92f9213fce",
                userIdentifier: "e5661097-4f73-4519-b781-98e4a5c68169",
                email: "user@elitefit.ai",
                mobile: "9876543210",
            }),
        });
        const data = await response.json();
        return data.redirectLink; // Returns the redirect link
    } catch (error: any) {
        Alert.alert('Error', error.message || 'Something went wrong.');
        throw error;
    }
};

// Request Camera and Microphone Permissions using Expo
const requestPermissions = async () => {
    try {
        // Request camera and microphone permissions
        const { status: cameraStatus } = await Permissions.askAsync(Permissions.CAMERA);
        const { status: microphoneStatus } = await Permissions.askAsync(Permissions.AUDIO_RECORDING);

        if (cameraStatus === 'granted') {
            console.log('Camera permission granted');
        } else {
            console.log('Camera permission denied');
        }

        if (microphoneStatus === 'granted') {
            console.log('Microphone permission granted');
        } else {
            console.log('Microphone permission denied');
        }
    } catch (err) {
        console.warn(err);
    }
};

export default function EliteFitScreen() {
    const webViewRef = useRef(null);
    const [redirectLink, setRedirectLink] = useState<string | null>(null);
    const [canGoBack, setCanGoBack] = useState(false);
    const [refreshing, setRefreshing] = useState(false); // Added state for refresh

    useEffect(() => {
        const loadLink = async () => {
            const link = await fetchRedirectLink();
            setRedirectLink(link);
            await requestPermissions(); // Request camera and microphone permissions on component mount
        };
        loadLink().then();

        // Allow both portrait and landscape
        ScreenOrientation.unlockAsync().then();

        // Back Button Handling
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (webViewRef.current && canGoBack) {
                webViewRef.current.goBack(); // Go back in the WebView
                return true; // Prevent the default back button behavior (exit the app)
            }
            return false; // Allow default back button behavior (exit the app)
        });

        return () => backHandler.remove(); // Cleanup on component unmount
    }, [canGoBack]);

    const handleNavigationStateChange = (navState: any) => {
        setCanGoBack(navState.canGoBack); // Update state based on navigation state
    };

    const handleWebViewMessage = (event: any) => {
        try {
            const message = JSON.parse(event.nativeEvent.data); // Parse the received message

            // Log the message from the WebView
            if (message.type === 'log') {
                console.log('Log from WebView:', message.message);
            } else if (message.type === 'error') {
                console.warn('Error from WebView:', message.message);
            } else if (message.type === 'warn') {
                console.warn('Warning from WebView:', message.message);
            } else if (message.type === 'info') {
                console.info('Info from WebView:', message.message);
            }
        } catch (error) {
            console.error('Error while processing message:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        const link = await fetchRedirectLink();
        setRedirectLink(link);
        setRefreshing(false);
    };

    if (!redirectLink) {
        return <SafeAreaView><Text>Loading...</Text></SafeAreaView>;
    }

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <ScrollView
                contentContainerStyle={{ flex: 1 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <WebView
                    ref={webViewRef}
                    source={{ uri: redirectLink }}
                    style={{ flex: 1 }}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    mediaPlaybackRequiresUserAction={false}
                    allowUniversalAccessFromFileURLs={true}
                    allowFileAccess={true}
                    onNavigationStateChange={handleNavigationStateChange} // Track WebView navigation state
                    onMessage={handleWebViewMessage} // Capture messages from the website
                    injectedJavaScript={`
                        (function() {
                          const originalLog = console.log;
                          const originalError = console.error;
                          const originalWarn = console.warn;
                          const originalInfo = console.info;

                          console.log = function(message) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message }));
                            originalLog.apply(console, arguments);
                          };

                          console.error = function(message) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message }));
                            originalError.apply(console, arguments);
                          };

                          console.warn = function(message) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'warn', message }));
                            originalWarn.apply(console, arguments);
                          };

                          console.info = function(message) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'info', message }));
                            originalInfo.apply(console, arguments);
                          };
                        })();
                        true;
                    `}
                />
            </ScrollView>
        </SafeAreaView>
    );
}
