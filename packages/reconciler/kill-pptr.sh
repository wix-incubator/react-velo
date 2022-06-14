#!/bin/sh
for X in `ps aux | grep puppeteer/.local-chromium/ | awk {'print $2'}`; do
    kill -9 $X
done
