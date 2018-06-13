#!/bin/bash

sudo apt-get -y update
sudo apt-get -y dist-upgrade

curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -

sudo apt-get install -y nodejs
sudo apt-get install -y fswebcam

node -v