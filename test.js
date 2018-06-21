var path = require('path');
var admin = require('firebase-admin');
var fs = require('fs');
var dgram = require('dgram');
var os = require('os');

var server = dgram.createSocket('udp4');

var structure = require('./helper/structure.js');

var serviceAccount = require('./credentials.json');

var PORT = 20777;
var HOST = '';

var app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://racing-leaderboard.firebaseio.com",
  storageBucket: "gs://racing-leaderboard.appspot.com"
});


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
snapshots = ['image.jpg'];
client_name = os.hostname().replace(/[.#$\[\]]/g, '-');

current_lap = 1;
// New lap
last_lap_data = {
	'laptime': 90.712837,
	'sector1': 30.102893,
	'sector2': 30.901273,
	'sector3': (90.712837 - 30.102893 - 30.901273),
	'invalid': false,
	'track': db.collection('tracks').doc(String(0)),
	'car': db.collection('cars').doc('modern_0'),
	'traction_control': 0.5,
	'anti_lock_brakes': true,
	'tire_compound': 1,
	'tyre_wear': [0, 0, 0, 0],
	'classic': false,
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
			console.log(snapshot);
			return;
			//fs.unlinkSync(snapshot);
		});
	});
});

