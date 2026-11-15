#!/bin/sh
# usage: contact.sh <dir> <glob> <out.png> [cols]
cols=${4:-4}
ffmpeg -y -loglevel error -pattern_type glob -i "$1/$2" -vf "scale=640:-1,tile=${cols}x6:padding=4:color=white" -frames:v 1 "$3"
