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

