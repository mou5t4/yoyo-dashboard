#!/bin/bash
# Audio playback helper script for device mode
# This script uses setsid to create a new session, allowing paplay to continue
# running after the parent Node.js process completes its exec call.
# This is necessary because execAsync would otherwise terminate the audio process
# when the shell exits.

setsid paplay "$1" < /dev/null > /dev/null 2>&1 &
echo "Started paplay with PID: $!"
