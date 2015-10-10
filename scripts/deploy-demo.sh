#!/bin/bash

# set username to the CI provider
git config --global user.email circleci@circleci
git config --global user.name CircleCI

# this task builds the demo page inside the build/ directory
gulp demo-copy

# checkout the demo branch and commit built artifacts to it
git checkout gh-pages
ls | grep -v build | grep -v node_modules | xargs rm -rf
mv build/* ./ && rm -r build
git status && git add --all .
git commit -m "Update (`date '+%F %T %Z'`) [ci skip]"

# deploy!
git push origin gh-pages