var path = require('path');
var admin = require('firebase-admin');
var fs = require('fs');
var dgram = require('dgram');
var os = require('os');
var NodeWebcam = require('node-webcam');

var server = dgram.createSocket('udp4');

var structure = require('./helper/structure.js');

var serviceAccount = require('./credentials.json');

var PORT = 20777;
var HOST = '';
var snapshotLocation = 'snapshots/';

var app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://racing-leaderboard.firebaseio.com",
  storageBucket: "gs://racing-leaderboard.appspot.com"
});

//Default options
var opts = {
    width: 1280,
    height: 720,
    quality: 90,
    // Save shots in memory
    saveShots: true,
    output: "jpg",
    //Which camera to use
    //Use Webcam.list() for results
    //false for default device
    device: false,
    // [location, buffer, base64]
    // Webcam.CallbackReturnTypes
    callbackReturn: "location",
    verbose: true
};

var Webcam = NodeWebcam.create( opts );

var db = admin.firestore();
var realtime_db = admin.database();
var clients_ref = realtime_db.ref('clients');
var bucket = admin.storage().bucket();

// floats = 4 bytes
laps = [];
current_lap = 0;
last_sector1 = 0;
last_sector2 = 0;
invalid_lap = false;
started = false;
last_update = new Date();
last_snapshot = new Date();
snapshots = [];
client_name = os.hostname().replace(/[.#$\[\]]/g, '-');

console.log('Available webcams:', Webcam.list());

console.log('Starting listener for client "' + client_name + '"');

server.on('listening', function () {
	var address = server.address();
	console.log('UDP Server listening on ' + address.address + ":" + address.port);
});

server.on('message', function (message, remote) {
	data = structure.fromPacket(message);

	// Update sector times
	if (last_sector1 != data.m_sector1_time && data.m_sector1_time != 0) {
		last_sector1 = data.m_sector1_time;
	}
	if (last_sector2 != data.m_sector2_time && data.m_sector2_time != 0) {
		last_sector2 = data.m_sector2_time;
	}
	if (data.m_currentLapInvalid == 1) {
		invalid_lap = true;
	}
	car_id = (data.m_era == 2017 ? 'modern' : 'classic') + '_' + data.m_team_info;

	// If the last update was more than a second ago, send a new update
	var now = new Date();
	if (now - last_update > 1000) {
		lap_data = data;
		lap_data.car = car_id;
		lap_data.time = new Date().getTime();
		lap_data.classic = (data.m_era != 2017);
		clients_ref.child(client_name).set(lap_data);
		last_update = now;
	}

	if (now - last_snapshot > 10 * 1000) {
		Webcam.capture( snapshotLocation + String(last_snapshot.getTime()), function( err, data ) {
			if (!err) {
				snapshots.push(data);
			}
		});
		last_snapshot = now;
	}

	// Full lap
	if (data.m_lap != current_lap && data.m_lap != 0) {
		if (!started) {
			started = true;
			return;
		}
		current_lap = data.m_lap
		// New lap
		last_lap_data = {
			'laptime': data.m_last_lap_time,
			'sector1': last_sector1,
			'sector2': last_sector2,
			'sector3': (data.m_last_lap_time - last_sector1 - last_sector2),
			'invalid': invalid_lap,
			'track': db.collection('tracks').doc(String(data.m_track_number)),
			'car': db.collection('cars').doc(car_id),
			'traction_control': data.m_traction_control,
			'anti_lock_brakes': data.m_anti_lock_brakes == 1,
			'tire_compound': data.m_tyre_compound,
			'tyre_wear': data.m_tyres_wear,
			'classic': (data.m_era != 2017),
			'time': new Date(),
			'client': client_name
		};

		db.collection('timings').add(last_lap_data).then(ref => {
			let lap_id = ref.id;
			console.info('Added new lap with ID: ', lap_id);			

			// Save snapshots to storage
			snapshots.forEach((snapshot) => {
				bucket.upload(snapshot, { destination: 'lap_photos/' + lap_id + '/' + snapshot }, (err, metadata, apiResponse) => {
					if (err) console.log(err);
					fs.unlinkSync(snapshot);
				});
			});
		});

		invalid_lap = false;
	}
});

server.bind(PORT, HOST);