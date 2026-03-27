// import { useState, useEffect, useRef } from 'react';
// import { Text, View, Button, Platform } from 'react-native';
// import * as Device from 'expo-device';
// import * as Notifications from 'expo-notifications';
// import Constants from 'expo-constants';

// Notifications.setNotificationHandler({
//     handleNotification: async () => ({
//         shouldPlaySound: false,
//         shouldSetBadge: false,
//         shouldShowBanner: true,
//         shouldShowList: true,
//     }),
// });

// export default function pushNotifications() {
//     const [expoPushToken, setExpoPushToken] = useState('');
//     const [channels, setChannels] = useState<Notifications.NotificationChannel>([]);
//     const [notification, setNotification] = useState<Notifications.Notification | undefined>(
//         undefined
//     );

//     useEffect(() => {
//         registerForPushNotificationAsync().then(token => token && setExpoPushToken(token));

//         if (Platform.OS === 'android') {
//             Notifications.getNotificationChannelAsync().then(value => setChannel(value ?? []));
//         }
//         const notificationListener = Notifications.addNotificationRecievedListener(notification => {
//             setNotification(notification);
//         });

//         const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
//             console.log(response);
//         });

//         return () => {
//             notificationListener.remove();
//             responseListener.remove();
//         };
//     }, []);

//     return (
//         <View style={{
//             flex:1,
//             alignItems: 'center',
//             justifyContent: 'space_around',
//         }}>
//             <Text> Your expo push token: {expoPushToken}</Text>
//             <Text>{'Channels: ${JSON.stringify(channels.map(c => c.id), null, 2)}'}</Text>

//             <View style={{alignItems:'center', justifyContent: 'center' }}>
//                 <Text>Title: {notification && notification.request.content.title} </Text>
//                 <Text>Body: {notification && notification.request.content.body}</Text>
//                 <Text>Data: {notification && JSON.stringify(notification.request.content.data)}</Text>
//             </View>
//             <Button
//                 title="Press to schedule a notification"
//                 onPress={async () => {
//                     await schedulePushNotification();
//                 }}
//             />
//         </View>
//     );
// }

// async function schedulePushNotification(){
//     await Notifications.scheduleNotificationAsync({
//         content: {
//             title: "you've got mail",
//             body: 'here is the notification body',
//             data: {data: 'goes here', test: {test1: 'more data'}},
//         },
//         trigger: {
//             type: Notifications.SchedualableTriggerInputTypes.TIME_INTERVAL,
//             seconds: 2,
//         },
//     });
// }

// async function registerForPushNotificationAsync(){
//     let token;

//     if (Platform.OS === 'android'){
//         await Notification.setNotificationChannelAsync('myNotificationChannel', {
//             name: 'a channel is needed for thr permissions prompt to appear',
//             importance: Notifications.AndroidImportance.MAX,
//             vibrationPattern : [0, 250, 250, 250],
//             lightColor: '#FF231F7C',
//         });
//     }

//     if (Device.isDevice) {
//         const {status: existingStatus } = await Notifications.getPermissionsAsync();
//         let finalStatus = existingStatus;
//         if (existingStatus !== 'granted') {
//             const { status } = await Notifications.requestPermissionsAsync();
//             finalStatus = status;
//         }
//         if (finalStatus !== 'granted') {
//             alert('Failed to get push token for push notification!');
//             return;
//         }
//         try {
//             const projectId = 
//                 Constants?.expoConfig.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
//             if (!projectId) {
//                 throw new Error('Project ID not found');
//             } 
//             token = (
//                 await Notifications.getExpoPushTokenAsync({
//                     projectId,
//                 })
//             ).data;
//             console.log(token);
//         }   catch (e) {
//             token = `${e}`;
//         }
//         } else {
//             alert('Must use physical device for Push Notifications');
//         }

//         return token;
// }