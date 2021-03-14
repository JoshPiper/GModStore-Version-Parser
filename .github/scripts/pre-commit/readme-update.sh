#!/bin/bash
perl -pi -e "s/JoshPiper\/GModStore-Version-Parser\@([\w.]+)?/JoshPiper\/GModStore-Version-Parser\@$BUILD_TAG/g" README.md
