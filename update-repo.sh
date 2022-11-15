#!/bin/bash
git add -A 
git commit -m "$(date +'%d.%m.%Y %H:%M')"
git push -u origin main
