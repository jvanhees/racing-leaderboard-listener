#!/bin/bash

sudo apt-get -y update
sudo apt-get -y dist-upgrade

sudo apt-get install -y nodejs
sudo apt-get install -y fswebcam

node -v

npm install

node index