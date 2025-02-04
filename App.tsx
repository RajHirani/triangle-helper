import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import TcpSocket from 'react-native-tcp-socket';
import moment from 'moment';
import DeviceInfo from 'react-native-device-info';
import axios from 'axios';
const GOOGLE_SHEET_ID ="e1M2p7CI";
const GOOGLE_API_KEY = '';

function App(): React.JSX.Element {

  const [vehicleNumber, setVehicleNumber] = useState('');
  const [location, setLocation] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState(null);
  const [uniqueId, setUniqueId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false);

  const getDeviceInfo = async () => {
    const uniqueId = await DeviceInfo.getUniqueId();
    console.log(uniqueId)
    setUniqueId(uniqueId);
    await fetchData(uniqueId);

  };

  const fetchData = async (uniqueId: string) => {
    try {
      const response = await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/trianglehelper?key=${GOOGLE_API_KEY}`
      );
      if(response.data.values.length){
        const data = response.data.values.find((item: any)=>{
          if(item[0] === uniqueId && item[1] === "ADMIN"){
            return true
          }
        })
        if(data){
          setIsAdmin(true);
        }
      }
      
    } catch (error) {
      console.error('Error fetching data from Google Sheets:', error);
    }
  };

  useEffect(()=>{
    getDeviceInfo();
  }, [])

  function fetchVechicleInformation() {
    if (vehicleNumber) {
      fetch(`https://vtmscgm.gujarat.gov.in/OpenVehicleStatus/GetOpenVehicleStatus?vehiclenumber=${vehicleNumber.toUpperCase()}`).then((response) => response.json())
        .then((json) => {
          if (json.length) {
            const data = json[0];
            setVehicleInfo(data);
            setLocation(`${data.lattitude},${data.longitude}`);
          } else {
            Alert.alert(
              "Error", // Title of the alert
              "No Data Found for vehicle", // Message to display
              [
                { text: "OK", onPress: () => console.log("OK Pressed") } // Actions (optional)
              ]
            );
          }

        }).catch(error => {
          Alert.alert(
            "Error", // Title of the alert
            "Not abel to get vehicle information", // Message to display
            [
              { text: "OK", onPress: () => console.log("OK Pressed") } // Actions (optional)
            ]
          );
        })
    }
  }


  function updateLatLong() {
    const message = prepareString();
    console.log(message);
    if (message) {
      callTCPSocket(message)
    } else {
      Alert.alert(
        "Error", // Title of the alert
        "Not abel to prepare message", // Message to display
        [
          { text: "OK", onPress: () => console.log("OK Pressed") } // Actions (optional)
        ]
      );
    }
  }
  
  const checkForAgency = (info: any) => {
    if(isAdmin) return true;
    if(info && info.agency === "blackboxgps" && info.subagency === "hiranidesign"){
      return true;
    }
  }

  function prepareString() {
    const vehicleData = vehicleInfo as any;

    if (location && location.includes(",") && checkForAgency(vehicleInfo)) {
      const sampleString = "$DP,BBOX77,7SG155H,NR,1,L,866477068223117,GJ18AT9770,1,03102024,044829,23.157255,N,72.553329,E,0,82,38,80,0.1,0.2,airtel,1,1,12.46,4.1,0,C,23,404,98,5698,16648,5698,16648,23,5698,16648,0,0,0,0,0,0,0,0000,00,1735,0,-10,11255.7,()*50";

      const data = sampleString.split(",");
      data[6] = vehicleData.deviceid;
      data[7] = vehicleData.vehicleregno;
      const date = moment().utc().format('DDMMYYYY');
      const time = moment().utc().format('HHmmss');
      data[9] = date;
      data[10] = time;
      data[11] = location.split(',')[0].trim();
      data[13] = location.split(',')[1].trim();

      const withoutCRC = data.join(",");
      const crc = calculateCRC(withoutCRC);
      data[data.length - 1] = `()*${crc}`;

      return data.join(",");
    }
    return null;
  }

  function calculateCRC(inputString: string) {
    // Remove the '$' from the start and extract everything before the '*'
    const data = inputString.slice(1, inputString.indexOf('*'));

    let checksum = 0;
    // XOR each character's ASCII value
    for (let i = 0; i < data.length; i++) {
      checksum ^= data.charCodeAt(i);
    }

    // Return the checksum in hexadecimal (uppercase)
    return checksum.toString(10).toUpperCase();
  }

  function callTCPSocket(message: string) {
    const client = TcpSocket.createConnection(
      { port: 5013, host: 'vtmscgm.gujarat.gov.in' },
      () => {
        console.log('Connected to server');
        if (client.write(message)) {
          client.end();
          Alert.alert(
            "Success", // Title of the alert
            "Data Sent successful", // Message to display
            [
              { text: "OK", onPress: () => console.log("OK Pressed") } // Actions (optional)
            ]
          );
        };
      }
    );

    client.on('data', (data) => {
      console.log('Received data: ', data.toString());
    });

    client.on('error', (error) => {
      console.error('Error: ', error);
    });

    client.on('close', () => {
      console.log('Connection closed');
    });

  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Triangle Helper</Text>

        <TextInput
          style={styles.input}
          placeholder="Vehicle Number"
          value={vehicleNumber}
          onChangeText={setVehicleNumber}
        />

        {vehicleInfo && (
          <TextInput
            style={styles.input}
            placeholder="Lat,Long"
            value={location}
            onChangeText={setLocation}
          />
        )}


        <TouchableOpacity style={styles.button} onPress={fetchVechicleInformation}>
          <Text style={styles.buttonText}>Fetch Details</Text>
        </TouchableOpacity>
        {vehicleInfo && (
          <TouchableOpacity style={[styles.button, styles.updateButton]} onPress={updateLatLong}>
            <Text style={styles.buttonText}>Update Location</Text>
          </TouchableOpacity>
        )}
        {vehicleInfo && (
          <ScrollView style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.cell, styles.header]}>Name</Text>
              <Text style={[styles.cell, styles.header]}>Value</Text>
            </View>
            {Object.keys(vehicleInfo).map((key) => (
              <View key={key} style={styles.row}>
                <Text style={styles.cell}>{key.replace('_', ' ').toUpperCase()}</Text>
                <Text style={styles.cell}>{vehicleInfo[key]}</Text>
              </View>
            ))}
          </ScrollView>
        )}
        <View style={styles.uniqueIdContainer}>
          <Text style={styles.uniqueIdText}>{uniqueId}</Text>
          {isAdmin && <Text style={styles.uniqueIdText}>ADMIN</Text>}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 40,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  updateButton: {
    backgroundColor: '#6f42c1',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  table: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  cell: {
    flex: 1,
    fontSize: 14,
  },
  header: {
    fontWeight: 'bold',
    backgroundColor: '#f0f0f0',
  },
  uniqueIdContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    padding: 10,
  },
  uniqueIdText:{
    fontSize: 10,
    textAlign: 'center',
  }
});

export default App;
